import { useState, useRef, useEffect, useCallback } from 'react';
import { Track, isValidPreviewUrl } from '@/lib/api';

interface UsePlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number; // 0-100 percentage
  currentTime: number; // seconds
  duration: number; // seconds
}

interface UsePlayerReturn extends UsePlayerState {
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (percentage: number) => void;
}

/**
 * Custom hook for managing audio playback with HTML5 audio element
 */
export function usePlayer(tracks: Track[]): UsePlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<UsePlayerState>({
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
  });

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      audioRef.current.volume = 0.8;
    }

    const audio = audioRef.current;

    // Audio event handlers
    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: audio.duration || 0,
      }));
    };

    const handleTimeUpdate = () => {
      if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        setState(prev => ({
          ...prev,
          progress,
          currentTime: audio.currentTime,
        }));
      }
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false, progress: 0, currentTime: 0 }));
      // Auto-play next track
      next();
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleLoadStart = () => {
      console.log('Loading audio...');
    };

    const handleCanPlay = () => {
      console.log('Audio can play');
    };

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      // Cleanup event listeners
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  /**
   * Find current track index in the tracks array
   */
  const getCurrentTrackIndex = useCallback(() => {
    if (!state.currentTrack) return -1;
    return tracks.findIndex(track => track.trackId === state.currentTrack!.trackId);
  }, [tracks, state.currentTrack]);

  /**
   * Play a specific track
   */
  const play = useCallback(async (track: Track) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    try {
      // Validate preview URL
      if (!isValidPreviewUrl(track.previewUrl)) {
        console.warn(`Invalid preview URL for track: ${track.name}`);
        return;
      }

      // If same track is already loaded, just resume
      if (state.currentTrack?.trackId === track.trackId && audio.src) {
        await audio.play();
        return;
      }

      // Load new track
      setState(prev => ({
        ...prev,
        currentTrack: track,
        progress: 0,
        currentTime: 0,
        duration: 0,
      }));

      console.log(`Playing: ${track.name} by ${track.artist}`);
      
      audio.src = track.previewUrl;
      audio.load(); // Reload the audio with new source
      
      // Wait a bit for load, then play
      await new Promise((resolve) => {
        const handleCanPlay = () => {
          audio.removeEventListener('canplay', handleCanPlay);
          resolve(undefined);
        };
        audio.addEventListener('canplay', handleCanPlay);
        
        // Fallback timeout
        setTimeout(resolve, 1000);
      });
      
      await audio.play();
      
    } catch (error) {
      console.error('Error playing track:', error);
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [state.currentTrack]);

  /**
   * Pause current playback
   */
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  /**
   * Resume current playback
   */
  const resume = useCallback(async () => {
    if (audioRef.current && state.currentTrack) {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('Error resuming playback:', error);
      }
    }
  }, [state.currentTrack]);

  /**
   * Play next track in the list
   */
  const next = useCallback(() => {
    const currentIndex = getCurrentTrackIndex();
    if (currentIndex === -1 || tracks.length === 0) return;

    const nextIndex = (currentIndex + 1) % tracks.length; // Loop to beginning
    const nextTrack = tracks[nextIndex];
    
    if (nextTrack) {
      play(nextTrack);
    }
  }, [getCurrentTrackIndex, tracks, play]);

  /**
   * Play previous track in the list
   */
  const prev = useCallback(() => {
    const currentIndex = getCurrentTrackIndex();
    if (currentIndex === -1 || tracks.length === 0) return;

    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    const prevTrack = tracks[prevIndex];
    
    if (prevTrack) {
      play(prevTrack);
    }
  }, [getCurrentTrackIndex, tracks, play]);

  /**
   * Seek to a specific position (percentage 0-100)
   */
  const seekTo = useCallback((percentage: number) => {
    if (!audioRef.current || !state.duration) return;

    const newTime = (percentage / 100) * state.duration;
    audioRef.current.currentTime = newTime;
    
    setState(prev => ({
      ...prev,
      progress: percentage,
      currentTime: newTime,
    }));
  }, [state.duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  return {
    ...state,
    play,
    pause,
    resume,
    next,
    prev,
    seekTo,
  };
}