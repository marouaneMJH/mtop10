import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { getTracksWithCache, forceRefreshCache, getTrackById } from './cache';

const router = Router();

/**
 * GET /api/tracks
 * Returns top 10 electronic tracks with cache management
 * Checks MongoDB for documents where fetchedAt > now - 1h
 * If fresh docs exist → return them sorted by rank
 * If stale/empty → trigger full fetch pipeline → persist → return
 */
router.get('/tracks', async (req: Request, res: Response) => {
  try {
    console.log('GET /api/tracks - Fetching tracks with cache management');
    
    const result = await getTracksWithCache();
    
    res.json({
      tracks: result.tracks,
      cachedAt: result.cachedAt,
      source: result.source,
    });
    
    console.log(`Returned ${result.tracks.length} tracks (source: ${result.source})`);
    
  } catch (error) {
    console.error('Error in GET /tracks:', error);
    
    res.status(500).json({
      error: 'Failed to fetch tracks',
      message: error instanceof Error ? error.message : 'Unknown error',
      tracks: [],
      cachedAt: new Date().toISOString(),
      source: 'error',
    });
  }
});

/**
 * GET /api/tracks/:id
 * Looks up a single track by trackId from MongoDB
 * Returns 404 if not found
 */
router.get('/tracks/:id', async (req: Request, res: Response) => {
  try {
    const trackId = parseInt(req.params.id, 10);
    
    if (isNaN(trackId)) {
      return res.status(400).json({
        error: 'Invalid track ID',
        message: 'Track ID must be a number',
      });
    }
    
    console.log(`GET /api/tracks/${trackId} - Looking up single track`);
    
    const track = await getTrackById(trackId);
    
    if (!track) {
      return res.status(404).json({
        error: 'Track not found',
        message: `No track found with ID ${trackId}`,
      });
    }
    
    res.json({ track });
    
    console.log(`Returned track: ${track.name} by ${track.artist}`);
    
  } catch (error) {
    console.error('Error in GET /tracks/:id:', error);
    
    res.status(500).json({
      error: 'Failed to fetch track',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/refresh
 * Bypasses TTL check — always fetches fresh from Apple APIs
 * Upserts all 10 docs, updates fetchedAt
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    console.log('POST /api/refresh - Force refreshing cache');
    
    const result = await forceRefreshCache();
    
    res.json({
      refreshed: result.refreshed,
      tracks: result.tracks,
      fetchedAt: result.fetchedAt,
    });
    
    console.log(`Force refresh completed - ${result.tracks.length} tracks updated`);
    
  } catch (error) {
    console.error('Error in POST /refresh:', error);
    
    res.status(500).json({
      error: 'Failed to refresh tracks',
      message: error instanceof Error ? error.message : 'Unknown error',
      refreshed: false,
      tracks: [],
      fetchedAt: new Date().toISOString(),
    });
  }
});

/**
 * GET /health
 * Returns 200 if Express is up and Mongoose connection state is connected
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
    
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: dbStatus,
      dbReadyState: dbState,
    };
    
    // Return 503 if database is not connected
    if (dbState !== 1) {
      return res.status(503).json({
        ...healthCheck,
        status: 'error',
        error: 'Database not connected',
      });
    }
    
    res.json(healthCheck);
    
  } catch (error) {
    console.error('Error in GET /health:', error);
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      db: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;