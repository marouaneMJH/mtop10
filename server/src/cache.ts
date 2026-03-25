import { Track, TrackModel } from './track';
import { fetchAppleTracks } from './apple';

const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10); // 1 hour default

/**
 * Checks if cached data is still fresh based on TTL
 */
export function isCacheFresh(fetchedAt: Date): boolean {
  const now = new Date();
  const ageInSeconds = (now.getTime() - fetchedAt.getTime()) / 1000;
  return ageInSeconds < CACHE_TTL_SECONDS;
}

/**
 * Retrieves tracks from MongoDB cache, checking freshness
 * Returns null if cache is stale or empty
 */
export async function getCachedTracks(): Promise<{ tracks: Track[]; source: 'cache' } | null> {
  try {
    // Find all tracks and sort by rank
    const cachedTracks = await TrackModel.find({}).sort({ rank: 1 }).lean();
    
    if (cachedTracks.length === 0) {
      console.log('No cached tracks found');
      return null;
    }
    
    // Check if any track is stale (using the oldest fetchedAt as reference)
    const oldestTrack = cachedTracks.reduce((oldest, current) => 
      current.fetchedAt < oldest.fetchedAt ? current : oldest
    );
    
    if (!isCacheFresh(oldestTrack.fetchedAt)) {
      console.log('Cached tracks are stale');
      return null;
    }
    
    console.log(`Retrieved ${cachedTracks.length} fresh tracks from cache`);
    return {
      tracks: cachedTracks as Track[],
      source: 'cache',
    };
    
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Fetches fresh tracks from Apple APIs and updates the cache
 * Uses upsert to update existing records or insert new ones
 */
export async function refreshTracksCache(): Promise<{ tracks: Track[]; source: 'live' }> {
  try {
    console.log('Fetching fresh tracks from Apple APIs...');
    
    // Fetch fresh data from Apple
    const freshTracks = await fetchAppleTracks();
    
    if (freshTracks.length === 0) {
      throw new Error('No tracks received from Apple APIs');
    }
    
    // Upsert each track (update if exists, insert if new)
    const upsertPromises = freshTracks.map(track =>
      TrackModel.findOneAndUpdate(
        { trackId: track.trackId },
        track,
        { 
          upsert: true, 
          new: true,
          runValidators: true 
        }
      )
    );
    
    await Promise.all(upsertPromises);
    
    console.log(`Successfully cached ${freshTracks.length} fresh tracks`);
    
    return {
      tracks: freshTracks,
      source: 'live',
    };
    
  } catch (error) {
    console.error('Error refreshing tracks cache:', error);
    throw new Error(`Failed to refresh cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets tracks with automatic cache management
 * Returns cached data if fresh, otherwise fetches and caches new data
 */
export async function getTracksWithCache(): Promise<{ tracks: Track[]; cachedAt: string; source: 'cache' | 'live' }> {
  try {
    // Try to get fresh cached data first
    const cachedResult = await getCachedTracks();
    
    if (cachedResult) {
      const cachedAt = cachedResult.tracks[0]?.fetchedAt || new Date();
      return {
        tracks: cachedResult.tracks,
        cachedAt: cachedAt.toISOString(),
        source: cachedResult.source,
      };
    }
    
    // Cache miss or stale - fetch fresh data
    const freshResult = await refreshTracksCache();
    
    const cachedAt = freshResult.tracks[0]?.fetchedAt || new Date();
    return {
      tracks: freshResult.tracks,
      cachedAt: cachedAt.toISOString(),
      source: freshResult.source,
    };
    
  } catch (error) {
    console.error('Error in getTracksWithCache:', error);
    
    // Last resort: try to return stale data if available
    try {
      const staleData = await TrackModel.find({}).sort({ rank: 1 }).lean();
      if (staleData.length > 0) {
        console.log('Returning stale cached data as fallback');
        const cachedAt = staleData[0]?.fetchedAt || new Date();
        return {
          tracks: staleData as Track[],
          cachedAt: cachedAt.toISOString(),
          source: 'cache',
        };
      }
    } catch (fallbackError) {
      console.error('Fallback to stale data also failed:', fallbackError);
    }
    
    throw error;
  }
}

/**
 * Force refresh cache, bypassing TTL check
 * Used by the manual refresh endpoint
 */
export async function forceRefreshCache(): Promise<{ refreshed: true; tracks: Track[]; fetchedAt: string }> {
  try {
    const result = await refreshTracksCache();
    
    const fetchedAt = result.tracks[0]?.fetchedAt || new Date();
    
    return {
      refreshed: true,
      tracks: result.tracks,
      fetchedAt: fetchedAt.toISOString(),
    };
    
  } catch (error) {
    console.error('Error in forceRefreshCache:', error);
    throw error;
  }
}

/**
 * Gets a single track by trackId from the cache
 */
export async function getTrackById(trackId: number): Promise<Track | null> {
  try {
    const track = await TrackModel.findOne({ trackId }).lean();
    return track as Track | null;
  } catch (error) {
    console.error('Error getting track by ID:', error);
    return null;
  }
}