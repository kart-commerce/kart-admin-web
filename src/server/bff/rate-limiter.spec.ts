import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, { count: number; expiresAt: number | null }>();

vi.mock('ioredis', () => ({
  default: class FakeRedis {
    async incr(key: string): Promise<number> {
      const entry = store.get(key) ?? { count: 0, expiresAt: null };
      entry.count += 1;
      store.set(key, entry);
      return entry.count;
    }
    async expire(key: string, seconds: number): Promise<void> {
      const entry = store.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + seconds * 1000;
      }
    }
    async ttl(key: string): Promise<number> {
      const entry = store.get(key);
      if (!entry?.expiresAt) {
        return -1;
      }
      return Math.ceil((entry.expiresAt - Date.now()) / 1000);
    }
  },
}));

describe('RateLimiter', () => {
  beforeEach(() => {
    store.clear();
  });

  it('allows requests up to the limit within the window', async () => {
    const { RateLimiter } = await import('./rate-limiter');
    const limiter = new RateLimiter();

    for (let i = 0; i < 5; i++) {
      expect((await limiter.consume('k', 5, 60)).allowed).toBe(true);
    }
  });

  it('rejects the request that exceeds the limit, with a positive retryAfterSeconds', async () => {
    const { RateLimiter } = await import('./rate-limiter');
    const limiter = new RateLimiter();

    for (let i = 0; i < 5; i++) {
      await limiter.consume('k', 5, 60);
    }
    const sixth = await limiter.consume('k', 5, 60);

    expect(sixth.allowed).toBe(false);
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks independent keys independently', async () => {
    const { RateLimiter } = await import('./rate-limiter');
    const limiter = new RateLimiter();

    for (let i = 0; i < 5; i++) {
      await limiter.consume('key-a', 5, 60);
    }

    expect((await limiter.consume('key-a', 5, 60)).allowed).toBe(false);
    expect((await limiter.consume('key-b', 5, 60)).allowed).toBe(true);
  });
});
