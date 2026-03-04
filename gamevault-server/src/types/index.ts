import { Request } from 'express';
import { Types } from 'mongoose';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  playerId: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  player?: JwtPayload;
}

// ─── Player ───────────────────────────────────────────────────────────────────

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  kills: number;
  deaths: number;
  gamesPlayed: number;
}

export interface IPlayer {
  _id: Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  elo: number;
  stats: PlayerStats;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export type SessionStatus = 'WAITING' | 'ACTIVE' | 'FINISHED' | 'ABANDONED';

export interface SessionPlayerResult {
  playerId: Types.ObjectId;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  outcome: 'WIN' | 'LOSS' | 'DRAW';
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
}

export interface ISession {
  _id: Types.ObjectId;
  gameMode: string;
  mapId: string;
  status: SessionStatus;
  players: Types.ObjectId[];
  results: SessionPlayerResult[];
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Item ─────────────────────────────────────────────────────────────────────

export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type ItemType = 'WEAPON' | 'ARMOR' | 'CONSUMABLE' | 'COSMETIC' | 'CURRENCY';

export interface IItem {
  _id: Types.ObjectId;
  playerId: Types.ObjectId;
  itemId: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  metadata?: Record<string, unknown>;
  awardedAt: Date;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
}

export interface PaginatedLeaderboard {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
