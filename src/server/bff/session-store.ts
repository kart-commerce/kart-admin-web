import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';

import { Role } from './identity-client';

/**
 * Server-held session record — this, not the browser cookie, is where the
 * access/refresh token pair actually lives (security.md's BFF pattern).
 * Backed by Redis rather than in-process memory so this BFF's pods can be
 * horizontally scaled and stateless, same posture as kart-web's own
 * SessionStore.
 */
export interface StoredSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly role: Role;
  readonly principalId: string;
  readonly grants: readonly string[];
  /** ISO timestamp — when this session's tokens were first issued. */
  readonly loginAt: string;
  /** ISO timestamp — the server-computed absolute session cap (security.md §2.2); never recomputed client-side. */
  readonly absoluteCapAt: string;
}

const SESSION_KEY_PREFIX = 'admin-session:';

/** security.md §2.2 — Admin's federated session never slides past 24h; Support Agent's native session is capped at 8h regardless of the native tier's usual 90-day cap. */
export const ABSOLUTE_CAP_HOURS: Record<Role, number> = {
  admin: 24,
  support_agent: 8,
  customer: 24,
  partner_api: 24,
};

export class SessionStore {
  private readonly redis: Redis;

  constructor(redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379') {
    this.redis = new Redis(redisUrl, { lazyConnect: true });
  }

  async create(session: Omit<StoredSession, 'loginAt' | 'absoluteCapAt'>): Promise<{ sessionId: string; stored: StoredSession }> {
    const sessionId = randomBytes(32).toString('base64url');
    const now = new Date();
    const capHours = ABSOLUTE_CAP_HOURS[session.role];
    const stored: StoredSession = {
      ...session,
      loginAt: now.toISOString(),
      absoluteCapAt: new Date(now.getTime() + capHours * 60 * 60 * 1000).toISOString(),
    };
    await this.save(sessionId, stored);
    return { sessionId, stored };
  }

  async save(sessionId: string, session: StoredSession): Promise<void> {
    const ttlSeconds = Math.max(1, Math.round((new Date(session.absoluteCapAt).getTime() - Date.now()) / 1000));
    await this.redis.set(SESSION_KEY_PREFIX + sessionId, JSON.stringify(session), 'EX', ttlSeconds);
  }

  async get(sessionId: string): Promise<StoredSession | null> {
    const raw = await this.redis.get(SESSION_KEY_PREFIX + sessionId);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  }

  async destroy(sessionId: string): Promise<void> {
    await this.redis.del(SESSION_KEY_PREFIX + sessionId);
  }

  absoluteCapSecondsRemaining(session: StoredSession): number {
    return Math.max(0, Math.round((new Date(session.absoluteCapAt).getTime() - Date.now()) / 1000));
  }
}

export const sessionStore = new SessionStore();
