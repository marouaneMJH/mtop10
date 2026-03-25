import React from 'react';
import { Track, formatDuration } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (percentage: number) => void;
}

export function Player({
  currentTrack,
  isPlaying,
  progress,
  currentTime,
  duration,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onSeek,
}: PlayerProps) {
  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, percent)));
  };

  // Don't show player if no current track
  if (!currentTrack) {
    return null;
  }

  const currentTimeFormatted = formatDuration(currentTime * 1000);
  const durationFormatted = formatDuration(duration * 1000);

  return (
    <div className="frosted-glass fixed bottom-0 left-0 right-0 z-50 border-t border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Current track info */}
          <div className="flex items-center gap-3 min-w-0 flex-1 max-w-xs">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
              {currentTrack.artworkUrl ? (
                <img 
                  src={currentTrack.artworkUrl} 
                  alt={`${currentTrack.name} artwork`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="font-syne font-semibold text-sm truncate text-foreground">
                {currentTrack.name}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {currentTrack.artist}
              </div>
            </div>
          </div>

          {/* Player controls */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
            {/* Control buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={onPrev}
                className="w-8 h-8 hover:text-primary"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              
              <Button
                size="icon"
                onClick={isPlaying ? onPause : onPlay}
                className="w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>
              
              <Button
                size="icon"
                variant="ghost"
                onClick={onNext}
                className="w-8 h-8 hover:text-primary"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2 w-full">
              <span className="font-mono text-xs text-muted-foreground min-w-[40px]">
                {currentTimeFormatted}
              </span>
              
              <div 
                className="flex-1 cursor-pointer"
                onClick={handleProgressClick}
              >
                <Progress 
                  value={progress} 
                  className="h-2 bg-secondary/50"
                />
              </div>
              
              <span className="font-mono text-xs text-muted-foreground min-w-[40px]">
                {durationFormatted}
              </span>
            </div>
          </div>

          {/* Volume controls placeholder - for future enhancement */}
          <div className="flex items-center justify-end min-w-0 flex-1 max-w-xs">
            <div className="flex items-center gap-1 text-primary">
              <div className="w-1 h-2 bg-primary rounded-full animate-pulse-cyan" />
              <div className="w-1 h-3 bg-primary rounded-full animate-pulse-cyan" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-4 bg-primary rounded-full animate-pulse-cyan" style={{ animationDelay: '0.4s' }} />
              <div className="w-1 h-3 bg-primary rounded-full animate-pulse-cyan" style={{ animationDelay: '0.6s' }} />
              <div className="w-1 h-2 bg-primary rounded-full animate-pulse-cyan" style={{ animationDelay: '0.8s' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}