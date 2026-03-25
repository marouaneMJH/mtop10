import React from 'react';
import { Track, formatDuration, isValidPreviewUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Play, Pause, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackCardProps {
  track: Track;
  isPlaying: boolean;
  isCurrent: boolean;
  onPlay: () => void;
  onPause: () => void;
}

export function TrackCard({ 
  track, 
  isPlaying, 
  isCurrent, 
  onPlay, 
  onPause 
}: TrackCardProps) {
  const handlePlayClick = () => {
    if (isCurrent && isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const canPlay = isValidPreviewUrl(track.previewUrl);
  const duration = formatDuration(track.trackTimeMillis);

  return (
    <div 
      className={cn(
        "track-row group flex items-center gap-4 p-4 rounded-lg border border-border/50",
        isCurrent && "active"
      )}
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8 text-center">
        <span className={cn(
          "font-mono text-lg font-bold",
          isCurrent ? "text-primary" : "text-muted-foreground"
        )}>
          #{track.rank}
        </span>
      </div>

      {/* Artwork */}
      <div className="flex-shrink-0 relative">
        <div className="w-14 h-14 rounded-md overflow-hidden bg-secondary">
          {track.artworkUrl ? (
            <img 
              src={track.artworkUrl} 
              alt={`${track.name} artwork`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>
        
        {/* Play button overlay */}
        {canPlay && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              className="w-8 h-8 bg-black/70 hover:bg-black/80 backdrop-blur-sm"
              onClick={handlePlayClick}
            >
              {isCurrent && isPlaying ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white ml-0.5" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1">
          <h3 className={cn(
            "font-syne font-semibold text-base truncate",
            isCurrent ? "text-primary" : "text-foreground"
          )}>
            {track.name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {track.artist}
          </p>
        </div>
      </div>

      {/* Duration and play button */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-muted-foreground">
          {duration}
        </span>
        
        {canPlay && (
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "w-10 h-10 opacity-60 hover:opacity-100 transition-opacity",
              isCurrent && isPlaying && "text-primary opacity-100"
            )}
            onClick={handlePlayClick}
          >
            {isCurrent && isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>
        )}
        
        {!canPlay && (
          <div className="w-10 h-10 flex items-center justify-center">
            <Music className="w-4 h-4 text-muted-foreground opacity-40" />
          </div>
        )}
      </div>

      {/* Active indicator */}
      {isCurrent && isPlaying && (
        <div className="flex-shrink-0 flex items-center gap-1">
          <div className="w-1 h-3 bg-primary rounded-full animate-pulse-cyan" />
          <div className="w-1 h-4 bg-primary rounded-full animate-pulse-cyan" style={{ animationDelay: '0.2s' }} />
          <div className="w-1 h-3 bg-primary rounded-full animate-pulse-cyan" style={{ animationDelay: '0.4s' }} />
        </div>
      )}
    </div>
  );
}