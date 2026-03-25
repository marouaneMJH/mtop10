import mongoose, { Schema, Document } from 'mongoose';

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
  fetchedAt: Date;
}

export interface TrackDocument extends Track, Document {}

const trackSchema = new Schema<TrackDocument>({
  trackId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  rank: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  artist: {
    type: String,
    required: true,
    trim: true,
  },
  album: {
    type: String,
    required: true,
    trim: true,
  },
  artworkUrl: {
    type: String,
    required: true,
  },
  previewUrl: {
    type: String,
    required: true,
  },
  genre: {
    type: String,
    required: true,
    default: 'Electronic',
  },
  releaseDate: {
    type: String,
    required: true,
  },
  trackTimeMillis: {
    type: Number,
    required: true,
  },
  fetchedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true, // TTL anchor - index this field for performance
  },
});

export const TrackModel = mongoose.model<TrackDocument>('Track', trackSchema);