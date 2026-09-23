import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  is_verified: number;
  created_at: string;
  currency: string;
  monthly_income: number;
  timezone: string;
  onboarding_completed: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  sessionToken?: string;
}

interface CachedSession {
  user: AuthenticatedUser;
  expiresAt: number;
  cachedAt: number;
}

const sessionCache = new Map<string, CachedSession>();
const SESSION_CACHE_TTL_MS = 60 * 1000; // 60 seconds memory cache

export function invalidateSessionCache(token?: string) {
  if (token) {
    sessionCache.delete(token);
  } else {
    sessionCache.clear();
  }
}

export async function createSession(userId: string, req: Request): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

  await db.prepare(`
    INSERT INTO sessions (id, user_id, token, user_agent, ip_address, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    userId,
    token,
    userAgent,
    typeof ipAddress === 'string' ? ipAddress : '127.0.0.1',
    expiresAt.toISOString(),
    new Date().toISOString()
  );

  return { token, expiresAt };
}

export async function invalidateSession(token: string) {
  sessionCache.delete(token);
  await db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export async function invalidateAllUserSessions(userId: string) {
  sessionCache.clear();
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function extractSessionToken(req: Request): string | null {
  // Check cookie first
  if (req.cookies && req.cookies.session_token) {
    return req.cookies.session_token;
  }
  // Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  // Check query parameter (direct links, file exports)
  if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  }
  return null;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = extractSessionToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Your session has expired or you are not logged in. Please log in.' });
    }

    const now = Date.now();
    // 1. Check in-memory cache for ultra-low latency response (0ms)
    const cached = sessionCache.get(token);
    if (cached && (now - cached.cachedAt < SESSION_CACHE_TTL_MS) && now < cached.expiresAt) {
      req.sessionToken = token;
      req.user = cached.user;
      return next();
    }

    // 2. Query database if not cached or cache expired
    const nowIso = new Date(now).toISOString();
    const sessionRow = await db.prepare(`
      SELECT s.id as session_id, s.token, s.expires_at,
             u.id as user_id, u.email, u.full_name, u.is_verified, u.created_at,
             st.currency, st.monthly_income, st.timezone, st.onboarding_completed
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN user_settings st ON u.id = st.user_id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, nowIso) as any;

    if (!sessionRow) {
      sessionCache.delete(token);
      return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }

    const authenticatedUser: AuthenticatedUser = {
      id: sessionRow.user_id,
      email: sessionRow.email,
      full_name: sessionRow.full_name,
      is_verified: Number(sessionRow.is_verified),
      created_at: sessionRow.created_at,
      currency: sessionRow.currency || 'PHP',
      monthly_income: Number(sessionRow.monthly_income || 0),
      timezone: sessionRow.timezone || 'Asia/Manila',
      onboarding_completed: Number(sessionRow.onboarding_completed || 0),
    };

    // Store in cache
    sessionCache.set(token, {
      user: authenticatedUser,
      expiresAt: new Date(sessionRow.expires_at).getTime(),
      cachedAt: now,
    });

    req.sessionToken = token;
    req.user = authenticatedUser;
    next();
  } catch (err) {
    next(err);
  }
}
