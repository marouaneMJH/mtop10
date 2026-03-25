import axios from 'axios';

// Get base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Create axios instance with default configuration
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    // Handle specific error cases
    if (error.response?.status === 404) {
      console.error('Resource not found');
    } else if (error.response?.status >= 500) {
      console.error('Server error');
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    } else if (error.code === 'ERR_NETWORK') {
      console.error('Network error - backend may be down');
    }
    
    return Promise.reject(error);
  }
);

// Types matching backend interface
export interface Track {
  trackId: number;
  rank: number;
  name: string;
  artist: string;
  album: string;
  artworkUrl: string;
  previewUrl: string;
  genre: string;
  releaseDate: string;
  trackTimeMillis: number;
  fetchedAt: string;
}

export interface TracksResponse {
  tracks: Track[];
  cachedAt: string;
  source: 'cache' | 'live' | 'error';
}

export interface TrackResponse {
  track: Track;
}

export interface RefreshResponse {
  refreshed: boolean;
  tracks: Track[];
  fetchedAt: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  db: 'connected' | 'disconnected' | 'unknown';
  dbReadyState?: number;
  error?: string;
}

// API functions
export const tracksApi = {
  /**
   * Get all tracks with cache management
   * Automatically returns cached data if fresh, or fetches live data if stale
   */
  async getTracks(): Promise<TracksResponse> {
    const response = await api.get<TracksResponse>('/tracks');
    return response.data;
  },

  /**
   * Get a single track by ID
   */
  async getTrackById(trackId: number): Promise<TrackResponse> {
    const response = await api.get<TrackResponse>(`/tracks/${trackId}`);
    return response.data;
  },

  /**
   * Force refresh tracks from Apple APIs
   * Bypasses cache TTL and fetches fresh data
   */
  async refreshTracks(): Promise<RefreshResponse> {
    const response = await api.post<RefreshResponse>('/refresh');
    return response.data;
  },

  /**
   * Check API health and database connection
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await api.get<HealthResponse>('/health');
    return response.data;
  },
};

// Utility functions
export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
};

export const isValidPreviewUrl = (url: string): boolean => {
  return url && url.startsWith('http') && url.includes('.m4a');
};

export default api;