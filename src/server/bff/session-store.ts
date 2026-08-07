import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';

import { Role } from './identity-client';
import { REDIS_LOCAL_URL } from '../../app/core/config/service-endpoints';

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
  /** True when `grants` may be incomplete because kart-admin-service couldn't actually be reached/checked at login (see admin-service-client.ts's `OwnGrantCategoriesResult`) — as opposed to a genuine zero-grants principal. */
  readonly grantsDegraded: boolean;
  /** ISO timestamp — when this session's tokens were first issued. */
  readonly loginAt: string;
  /** ISO timestamp — the server-computed absolute session cap (security.md §2.2); never recomputed client-side. */
  readonly absoluteCapAt: string;
  /** ISO timestamp — when the *current* `accessToken` expires (from identity-service's `expiresIn`), refreshed on every rotation. Lets the client schedule a proactive refresh ahead of expiry instead of relying solely on a reactive 401 (see `AccessTokenRefreshSchedulerService`). */
  readonly accessTokenExpiresAt: string;
}

const SESSION_KEY_PREFIX = 'admin-session:';
const REFRESH_LOCK_PREFIX = 'admin-session-refresh-lock:';

/**
 * How long a refresh lock is held before it self-expires. Generous relative to a normal
 * identity-service round-trip, but short enough that a holder that crashed/was killed mid-refresh
 * doesn't wedge every other pod's refresh attempts for this session for long.
 */
const REFRESH_LOCK_TTL_MS = 8_000;

/**
 * Releases a refresh lock only if it still holds the caller's own fencing token — a plain `DEL`
 * would risk deleting a *different* holder's lock if this caller's own hold outlived the TTL and
 * someone else has since acquired it (classic distributed-lock pitfall). Atomic via Lua so the
 * check-and-delete can't itself race a concurrent acquire.
 */
const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/** security.md §2.2 — Admin's federated session never slides past 24h; Support Agent's native session is capped at 8h regardless of the native tier's usual 90-day cap. */
export const ABSOLUTE_CAP_HOURS: Record<Role, number> = {
  admin: 24,
  support_agent: 8,
  customer: 24,
  partner_api: 24,
};

export class SessionStore {
  private readonly redis: Redis;

  constructor(redisUrl = process.env['REDIS_URL'] ?? REDIS_LOCAL_URL) {
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

  /**
   * Cross-instance mutual exclusion for `/auth/refresh` (AUTH-3 hardening): the identity
   * service's refresh token is single-use/rotating, so at most one BFF pod may ever be mid-flight
   * redeeming a given session's refresh token at a time — a second, concurrent redemption looks
   * like refresh-token *reuse* to identity-service and gets the whole session torn down, even
   * though the first redemption was perfectly legitimate. An in-process guard (e.g. a `Map`)
   * only protects a single pod; behind a load balancer with no session affinity, two requests
   * from the same browser session can land on two different pods at once. This lock is the only
   * thing that's actually safe at that scale.
   *
   * Returns `true` iff this caller now holds the lock. Callers that don't must not call
   * `identityClient.refresh()` themselves — see `routes.ts`'s `awaitConcurrentRefresh`.
   */
  async acquireRefreshLock(sessionId: string, fencingToken: string): Promise<boolean> {
    const result = await this.redis.set(REFRESH_LOCK_PREFIX + sessionId, fencingToken, 'PX', REFRESH_LOCK_TTL_MS, 'NX');
    return result === 'OK';
  }

  /** Releases a refresh lock this caller holds. A no-op (not an error) if it already expired or was never held. */
  async releaseRefreshLock(sessionId: string, fencingToken: string): Promise<void> {
    await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, REFRESH_LOCK_PREFIX + sessionId, fencingToken);
  }
}

export const sessionStore = new SessionStore();
