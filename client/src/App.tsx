import React from "react";
import { useTracks } from "@/hooks/useTracks";
import { usePlayer } from "@/hooks/usePlayer";
import { TrackList } from "@/components/TrackList";
import { Player } from "@/components/Player";
import { RefreshButton } from "@/components/RefreshButton";
import { Separator } from "@/components/ui/separator";
import { formatTimeAgo } from "@/lib/api";
import { Loader2, AlertCircle, Music, Waves } from "lucide-react";

function App() {
    const { tracks, loading, error, lastFetched, source, forceRefresh } =
        useTracks();
    const player = usePlayer(tracks);

    const handlePlay = (track: any) => {
        player.play(track);
    };

    const handlePause = () => {
        player.pause();
    };

    const handleRefresh = async () => {
        await forceRefresh();
    };

    // Loading state
    if (loading && tracks.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <div>
                        <h2 className="font-syne font-bold text-xl text-foreground">
                            Loading Top 10 Electronic Tracks
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Fetching the latest tracks from Apple Music...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state (when no cached data available)
    if (error && tracks.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md mx-auto px-4">
                    <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
                    <div>
                        <h2 className="font-syne font-bold text-xl text-foreground">
                            Unable to Load Tracks
                        </h2>
                        <p className="text-muted-foreground mt-2">{error}</p>
                        <div className="mt-4">
                            <RefreshButton onRefresh={handleRefresh} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50">
                <div className="container mx-auto px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                    <Waves className="w-5 h-5 text-primary-foreground" />
                                </div>
                                <h1 className="font-syne font-bold text-3xl text-foreground">
                                    US Top 10 Electronic
                                </h1>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span>
                                    Last updated:{" "}
                                    {lastFetched
                                        ? formatTimeAgo(lastFetched)
                                        : "Unknown"}
                                </span>
                                <span>•</span>
                                <span className="capitalize">
                                    Source:{" "}
                                    {source === "live"
                                        ? "Live"
                                        : source === "cache"
                                          ? "Cache"
                                          : "Error"}
                                </span>
                                {error && tracks.length > 0 && (
                                    <>
                                        <span>•</span>
                                        <span className="text-amber-400">
                                            Showing cached data (refresh failed)
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <RefreshButton
                            onRefresh={handleRefresh}
                            className="flex-shrink-0"
                        />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-8">
                {loading && tracks.length > 0 && (
                    <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-sm text-primary">
                                Refreshing tracks...
                            </span>
                        </div>
                    </div>
                )}

                {error && tracks.length > 0 && (
                    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-4 h-4 text-destructive" />
                            <span className="text-sm text-destructive">
                                Refresh failed: {error} (showing cached data)
                            </span>
                        </div>
                    </div>
                )}

                {/* Track List */}
                <div className="max-w-4xl mx-auto">
                    <TrackList
                        tracks={tracks}
                        currentTrack={player.currentTrack}
                        isPlaying={player.isPlaying}
                        onPlay={handlePlay}
                        onPause={handlePause}
                    />
                </div>

                {/* Bottom spacing for fixed player */}
                {player.currentTrack && <div className="h-24" />}
            </main>

            {/* Fixed Player */}
            <Player
                currentTrack={player.currentTrack}
                isPlaying={player.isPlaying}
                progress={player.progress}
                currentTime={player.currentTime}
                duration={player.duration}
                onPlay={player.resume}
                onPause={player.pause}
                onPrev={player.prev}
                onNext={player.next}
                onSeek={player.seekTo}
            />
        </div>
    );
}

export default App;
