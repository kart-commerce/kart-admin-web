import Redis from 'ioredis';

import { REDIS_LOCAL_URL } from '../../app/core/config/service-endpoints';

/**
 * Redis-backed fixed-window request counter, shared by every BFF pod (not an in-process
 * counter — that would let a caller bypass the limit just by hitting a different pod). Backs
 * `rate-limit-middleware.ts`'s protection of `/auth/native/login`, `/auth/native/mfa/verify`,
 * and `/auth/refresh` against credential stuffing and refresh-storm abuse.
 *
 * Fixed-window (not sliding/token-bucket) is a deliberate simplicity choice: it allows a burst
 * of up to `limit` requests right at a window boundary, which is an acceptable trade-off for an
 * abuse backstop that only needs to bound worst-case load, not enforce an exact rate.
 */
export class RateLimiter {
  private readonly redis: Redis;

  constructor(redisUrl = process.env['REDIS_URL'] ?? REDIS_LOCAL_URL) {
    this.redis = new Redis(redisUrl, { lazyConnect: true });
  }

  /** Increments `key`'s counter for the current window, creating it with `windowSeconds` TTL on first use. */
  async consume(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    if (count <= limit) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    const ttl = await this.redis.ttl(key);
    return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds };
  }
}

export const rateLimiter = new RateLimiter();
