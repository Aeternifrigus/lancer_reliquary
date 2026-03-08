import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest, JwtPayload } from '../types';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.player = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid token' });
    }
  }
}

// Use this on routes where a player should only touch their own data
export function authorizePlayer(req: AuthRequest, res: Response, next: NextFunction): void {
  const routePlayerId = req.params.playerId ?? req.params.id;

  if (!req.player) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  if (req.player.playerId !== routePlayerId) {
    res.status(403).json({ success: false, error: "Cannot access another player's resource" });
    return;
  }

  next();
}
