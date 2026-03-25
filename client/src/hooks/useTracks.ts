import { useState, useEffect, useCallback } from 'react';
import { tracksApi, Track, TracksResponse } from '@/lib/api';

interface UseTracksState {
  tracks: Track[];
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
  source: 'cache' | 'live' | 'error' | null;
}

interface UseTracksReturn extends UseTracksState {
  refetch: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

/**
 * Custom hook for managing tracks data with automatic loading, error handling, and refresh capabilities
 */
export function useTracks(): UseTracksReturn {
  const [state, setState] = useState<UseTracksState>({
    tracks: [],
    loading: true,
    error: null,
    lastFetched: null,
    source: null,
  });

  /**
   * Fetch tracks from the API
   */
  const fetchTracks = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      const response: TracksResponse = await tracksApi.getTracks();
      
      setState(prev => ({
        ...prev,
        tracks: response.tracks,
        loading: false,
        error: null,
        lastFetched: response.cachedAt,
        source: response.source,
      }));

      console.log(`Loaded ${response.tracks.length} tracks from ${response.source}`);

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load tracks';

      console.error('Error fetching tracks:', error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        source: 'error',
      }));
    }
  }, []);

  /**
   * Force refresh tracks from Apple APIs (bypasses cache)
   */
  const forceRefresh = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      console.log('Forcing refresh from Apple APIs...');
      const response = await tracksApi.refreshTracks();
      
      setState(prev => ({
        ...prev,
        tracks: response.tracks,
        loading: false,
        error: null,
        lastFetched: response.fetchedAt,
        source: 'live',
      }));

      console.log(`Force refresh completed - ${response.tracks.length} tracks updated`);

    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to refresh tracks';

      console.error('Error force refreshing tracks:', error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Refetch tracks (same as initial fetch)
   */
  const refetch = useCallback(async () => {
    await fetchTracks(true);
  }, [fetchTracks]);

  // Initial fetch on mount
  useEffect(() => {
    fetchTracks(true);
  }, [fetchTracks]);

  // Auto-refetch every 5 minutes in the background (without loading state)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.loading) {
        console.log('Auto-refetching tracks in background...');
        fetchTracks(false); // Don't show loading spinner for background updates
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchTracks, state.loading]);

  return {
    ...state,
    refetch,
    forceRefresh,
  };
}