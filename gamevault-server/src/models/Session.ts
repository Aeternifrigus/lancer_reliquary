import { Schema, model, Document } from 'mongoose';
import { ISession, SessionStatus, SessionPlayerResult } from '../types';

export interface SessionDocument extends Omit<ISession, '_id'>, Document {}

const ResultSchema = new Schema<SessionPlayerResult>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    kills: { type: Number, required: true, min: 0 },
    deaths: { type: Number, required: true, min: 0 },
    assists: { type: Number, default: 0, min: 0 },
    score: { type: Number, required: true, min: 0 },
    outcome: { type: String, enum: ['WIN', 'LOSS', 'DRAW'], required: true },
    eloBefore: { type: Number, required: true },
    eloAfter: { type: Number, required: true },
    eloChange: { type: Number, required: true },
  },
  { _id: false }
);

const SessionSchema = new Schema<SessionDocument>(
  {
    gameMode: {
      type: String,
      required: true,
      trim: true,
      enum: ['deathmatch', 'team_deathmatch', 'capture_the_flag', 'battle_royale', 'ranked'],
    },
    mapId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['WAITING', 'ACTIVE', 'FINISHED', 'ABANDONED'] satisfies SessionStatus[],
      default: 'WAITING',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    players: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
    results: [ResultSchema],
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

SessionSchema.index({ status: 1, createdAt: -1 });
SessionSchema.index({ players: 1 });

export const Session = model<SessionDocument>('Session', SessionSchema);
