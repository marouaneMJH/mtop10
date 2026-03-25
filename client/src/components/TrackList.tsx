import React from 'react';
import { Track } from '@/lib/api';
import { TrackCard } from './TrackCard';

interface TrackListProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  onPause: () => void;
}

export function TrackList({ 
  tracks, 
  currentTrack, 
  isPlaying, 
  onPlay, 
  onPause 
}: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">No tracks available</p>
          <p className="text-muted-foreground text-sm mt-1">
            Try refreshing to load the latest tracks
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((track) => (
        <TrackCard
          key={track.trackId}
          track={track}
          isPlaying={isPlaying}
          isCurrent={currentTrack?.trackId === track.trackId}
          onPlay={() => onPlay(track)}
          onPause={onPause}
        />
      ))}
    </div>
  );
}