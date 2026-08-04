import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('ioredis', () => ({
  default: class FakeRedis {
    async set(key: string, value: string): Promise<void> {
      store.set(key, value);
    }
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    }
    async del(key: string): Promise<void> {
      store.delete(key);
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
    });
    const agentSession = await sessionStore.create({
      accessToken: 'a',
      refreshToken: 'r',
      role: 'support_agent',
      principalId: 'p2',
      grants: [],
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
});
