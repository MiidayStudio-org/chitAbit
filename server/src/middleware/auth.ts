import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { dbService } from '../db/index.js';

export interface AuthPayload {
  userId: string;
  username: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

// Same value the project used before, so local sessions keep working in dev.
// It is public in git, so it must never be used in production.
const DEV_FALLBACK_SECRET = 'chitabit_secret_jwt_key_2026';

let cachedSecret: string | null = null;

// Read lazily: ES module imports run before dotenv.config() in index.ts.
export function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.JWT_SECRET?.trim();
  // The placeholder from .env.example counts as "not set"
  if (fromEnv && fromEnv !== 'change_me_to_a_long_random_string') {
    cachedSecret = fromEnv;
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  } else {
    console.warn('[Auth] JWT_SECRET is not set. Using an insecure dev-only secret.');
    cachedSecret = DEV_FALLBACK_SECRET;
  }
  return cachedSecret;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });
}

// Returns the payload only if the token is valid AND the user still exists.
export async function verifyToken(token: unknown): Promise<AuthPayload | null> {
  if (typeof token !== 'string' || !token) return null;
  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
  if (typeof decoded !== 'object' || typeof decoded.userId !== 'string') return null;
  const user = await dbService.getUserById(decoded.userId);
  return user ? { userId: user.id, username: user.username } : null;
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void verifyToken(getBearerToken(req)).then((auth) => {
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized: missing or invalid token' });
      return;
    }
    req.auth = auth;
    next();
  }).catch(next);
}

// Use only after requireAuth.
export function authUserId(req: Request): string {
  return req.auth!.userId;
}
