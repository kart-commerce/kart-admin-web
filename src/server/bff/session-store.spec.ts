import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('ioredis', () => ({
  default: class FakeRedis {
    // Mirrors the one overload this codebase actually uses: `SET key value 'PX' ms 'NX'`
    // (the refresh lock) vs. the plain `SET key value 'EX' seconds` (session persistence).
    // Real ioredis's SET NX returns null (not stored) rather than throwing when the key
    // already exists — reproduced here so `acquireRefreshLock`'s `=== 'OK'` check is exercised
    // the same way it would be against a real server.
    async set(key: string, value: string, ...args: unknown[]): Promise<string | null> {
      if (args[args.length - 1] === 'NX' && store.has(key)) {
        return null;
      }
      store.set(key, value);
      return 'OK';
    }
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    }
    async del(key: string): Promise<void> {
      store.delete(key);
    }
    // Only ever invoked with the compare-and-delete release script — reproduces its exact
    // semantics rather than genuinely interpreting Lua.
    async eval(_script: string, _numKeys: number, key: string, expectedValue: string): Promise<number> {
      if (store.get(key) === expectedValue) {
        store.delete(key);
        return 1;
      }
      return 0;
    }
  },
}));

describe('SessionStore', () => {
  beforeEach(() => {
    store.clear();
  });

  it('create() computes absoluteCapAt from the role-specific cap (24h Admin / 8h Support Agent)', async () => {
    const { SessionStore } = await import('./session-store');
    const sessionStore = new SessionStore();

    const adminSession = await sessionStore.create({
      accessToken: 'a',
      refreshToken: 'r',
      role: 'admin',
      principalId: 'p1',
      grants: [],
      grantsDegraded: false,
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
    const agentSession = await sessionStore.create({
      accessToken: 'a',
      refreshToken: 'r',
      role: 'support_agent',
      principalId: 'p2',
      grants: [],
      grantsDegraded: false,
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    });

    const adminCapHours = (new Date(adminSession.stored.absoluteCapAt).getTime() - new Date(adminSession.stored.loginAt).getTime()) / 3_600_000;
    const agentCapHours = (new Date(agentSession.stored.absoluteCapAt).getTime() - new Date(agentSession.stored.loginAt).getTime()) / 3_600_000;

    expect(adminCapHours).toBeCloseTo(24, 1);
    expect(agentCapHours).toBeCloseTo(8, 1);
  });

  it('get() round-trips a session created via create()', async () => {
    const { SessionStore } = await import('./session-store');
    const sessionStore = new SessionStore();

    const { sessionId, stored } = await sessionStore.create({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      role: 'admin',
      principalId: 'p1',
      grants: ['catalog-management'],
      grantsDegraded: false,
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    });

    expect(await sessionStore.get(sessionId)).toEqual(stored);
  });

  it('get() returns null for an unknown session id', async () => {
    const { SessionStore } = await import('./session-store');
    expect(await new SessionStore().get('nonexistent')).toBeNull();
  });

  it('destroy() removes the session', async () => {
    const { SessionStore } = await import('./session-store');
    const sessionStore = new SessionStore();
    const { sessionId } = await sessionStore.create({
      accessToken: 'a',
      refreshToken: 'r',
      role: 'admin',
      principalId: 'p1',
      grants: [],
      grantsDegraded: false,
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    });

    await sessionStore.destroy(sessionId);
    expect(await sessionStore.get(sessionId)).toBeNull();
  });

  it('save() updates an existing session (e.g. rotated tokens after refresh)', async () => {
    const { SessionStore } = await import('./session-store');
    const sessionStore = new SessionStore();
    const { sessionId, stored } = await sessionStore.create({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      role: 'admin',
      principalId: 'p1',
      grants: [],
      grantsDegraded: false,
      accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    });

    await sessionStore.save(sessionId, { ...stored, accessToken: 'new-access', refreshToken: 'new-refresh' });
    const updated = await sessionStore.get(sessionId);

    expect(updated?.accessToken).toBe('new-access');
    expect(updated?.refreshToken).toBe('new-refresh');
  });

  it('absoluteCapSecondsRemaining() reflects time left until the cap, floored at zero', async () => {
    const { SessionStore } = await import('./session-store');
    const sessionStore = new SessionStore();
    const future = { absoluteCapAt: new Date(Date.now() + 60_000).toISOString() } as never;
    const past = { absoluteCapAt: new Date(Date.now() - 60_000).toISOString() } as never;

    expect(sessionStore.absoluteCapSecondsRemaining(future)).toBeGreaterThan(0);
    expect(sessionStore.absoluteCapSecondsRemaining(past)).toBe(0);
  });

  describe('refresh lock (cross-instance mutual exclusion for /auth/refresh)', () => {
    it('acquireRefreshLock() grants the lock when nobody holds it, and refuses a second caller while it is held', async () => {
      const { SessionStore } = await import('./session-store');
      const sessionStore = new SessionStore();

      expect(await sessionStore.acquireRefreshLock('session-1', 'holder-a')).toBe(true);
      // A different caller (a different pod, in production) racing for the same session must not
      // also be granted the lock — this is the entire point of the mechanism.
      expect(await sessionStore.acquireRefreshLock('session-1', 'holder-b')).toBe(false);
    });

    it('releaseRefreshLock() lets a subsequent caller acquire it', async () => {
      const { SessionStore } = await import('./session-store');
      const sessionStore = new SessionStore();

      await sessionStore.acquireRefreshLock('session-1', 'holder-a');
      await sessionStore.releaseRefreshLock('session-1', 'holder-a');

      expect(await sessionStore.acquireRefreshLock('session-1', 'holder-b')).toBe(true);
    });

    it('releaseRefreshLock() with the wrong fencing token does not release someone else\'s lock', async () => {
      const { SessionStore } = await import('./session-store');
      const sessionStore = new SessionStore();

      await sessionStore.acquireRefreshLock('session-1', 'holder-a');
      // holder-a's hold outlived its TTL and holder-b has since legitimately acquired it —
      // holder-a's (late) release must not delete holder-b's live lock.
      await sessionStore.releaseRefreshLock('session-1', 'a-stale-fencing-token-not-currently-held');

      expect(await sessionStore.acquireRefreshLock('session-1', 'holder-c')).toBe(false);
    });

    it('locks for different sessions are independent', async () => {
      const { SessionStore } = await import('./session-store');
      const sessionStore = new SessionStore();

      expect(await sessionStore.acquireRefreshLock('session-1', 'holder-a')).toBe(true);
      expect(await sessionStore.acquireRefreshLock('session-2', 'holder-b')).toBe(true);
    });
  });
});
