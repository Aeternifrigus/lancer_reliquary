import { Schema, model, Document } from 'mongoose';
import { IPlayer } from '../types';

export interface PlayerDocument extends Omit<IPlayer, '_id'>, Document {}

const PlayerSchema = new Schema<PlayerDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
      match: /^[a-zA-Z0-9_-]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // select:false means this field is never returned unless you explicitly ask for it
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    elo: {
      type: Number,
      default: 1200,
      min: 0,
    },
    stats: {
      wins: { type: Number, default: 0, min: 0 },
      losses: { type: Number, default: 0, min: 0 },
      draws: { type: Number, default: 0, min: 0 },
      kills: { type: Number, default: 0, min: 0 },
      deaths: { type: Number, default: 0, min: 0 },
      gamesPlayed: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true, versionKey: false }
);

PlayerSchema.index({ elo: -1 });
PlayerSchema.index({ 'stats.wins': -1 });

export const Player = model<PlayerDocument>('Player', PlayerSchema);
