import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Player, PlayerDocument } from '../models/Player';
import { JwtPayload } from '../types';
import { createError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;

// A real hash at the same cost factor. Comparing against it for unknown
// usernames makes a failed login take as long as a wrong password, so response
// times do not reveal which usernames exist. It has to be a valid bcrypt hash:
// bcryptjs returns false immediately for a malformed one.
const DUMMY_HASH = bcrypt.hashSync('gamevault-timing-equaliser', SALT_ROUNDS);

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResult {
  token: string;
  player: {
    id: string;
    username: string;
    email: string;
    elo: number;
  };
}

export async function registerPlayer(dto: RegisterDto): Promise<AuthResult> {
  const existing = await Player.findOne({
    $or: [{ username: dto.username }, { email: dto.email }],
  });

  if (existing) {
    const field = existing.username === dto.username ? 'username' : 'email';
    throw createError(`That ${field} is already taken`, 409);
  }

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
  const player = await Player.create({ username: dto.username, email: dto.email, passwordHash });

  return { token: signToken(player), player: toPublic(player) };
}

export async function loginPlayer(dto: LoginDto): Promise<AuthResult> {
  // passwordHash has select:false so we have to ask for it explicitly
  const player = await Player.findOne({ username: dto.username }).select('+passwordHash');

  if (!player) {
    // still run bcrypt so the response time doesn't leak whether the user exists
    await bcrypt.compare(dto.password, DUMMY_HASH);
    throw createError('Invalid username or password', 401);
  }

  const valid = await bcrypt.compare(dto.password, player.passwordHash);
  if (!valid) throw createError('Invalid username or password', 401);

  return { token: signToken(player), player: toPublic(player) };
}

function signToken(player: PlayerDocument): string {
  const payload: JwtPayload = {
    playerId: (player._id as { toString(): string }).toString(),
    username: player.username,
  };
  // @types/jsonwebtoken v9 wants a branded ms.StringValue; the config value is always
  // something like "24h", so cast through unknown
  const expiresIn = config.jwt.expiresIn as unknown as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

function toPublic(player: PlayerDocument) {
  return {
    id: (player._id as { toString(): string }).toString(),
    username: player.username,
    email: player.email,
    elo: player.elo,
  };
}
