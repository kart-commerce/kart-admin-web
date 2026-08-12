import { NextFunction, Request, Response } from 'express';

import { logger } from '../logger';
import { readSessionId } from './cookie';
import { rateLimiter } from './rate-limiter';

const RATE_LIMIT_KEY_PREFIX = 'admin-bff-rate-limit:';

export interface RateLimitOptions {
  /** Max requests allowed per window for a given key. */
  readonly limit: number;
  readonly windowSeconds: number;
  /** Namespaces this limiter's Redis keys from every other one (e.g. `'login'`, `'refresh'`). */
  readonly name: string;
  /** How to derive the thing being limited — defaults to caller IP. `/auth/refresh` keys off the session instead (see its registration below), since IP-based limiting alone would let one login-storming attacker exhaust a limit shared with every other user behind the same NAT/corporate IP. */
  readonly keyFn?: (req: Request) => string;
}

function clientIp(req: Request): string {
  // `req.ip` honors Express's `trust proxy` setting (server.ts, `TRUST_PROXY` env) — falls back
  // to the raw socket address so this still degrades safely (one shared bucket per literal
  // connection) rather than throwing if trust proxy is left unconfigured.
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/** Keys by session id when the caller has one, else by IP — used for `/auth/refresh` so one abusive session can't burn through a limit shared with every other user on the same corporate/NAT IP, while an unauthenticated caller (no session yet) still falls back to IP-based limiting. */
export function sessionOrIpKey(req: Request): string {
  return readSessionId(req.headers.cookie) ?? clientIp(req);
}

/**
 * Redis-backed rate limiting for the auth endpoints most exposed to abuse — credential stuffing
 * against `/auth/native/login` and `/auth/native/mfa/verify`, or a refresh-storm (buggy client,
 * or deliberate abuse) against `/auth/refresh`. Deliberately **fails open**: if the Redis check
 * itself errors (e.g. a brief Redis blip), the request is allowed through rather than rejected —
 * a rate-limiter outage must never become an availability outage for every legitimate login,
 * which would be a far worse failure mode than temporarily under-enforcing the limit.
 */
export function rateLimit(options: RateLimitOptions) {
  const keyFn = options.keyFn ?? clientIp;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const redisKey = `${RATE_LIMIT_KEY_PREFIX}${options.name}:${keyFn(req)}`;
    try {
      const result = await rateLimiter.consume(redisKey, options.limit, options.windowSeconds);
      if (!result.allowed) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
        res.status(429).json({
          code: 'rate_limited',
          message: 'Too many attempts. Please wait before trying again.',
        });
        return;
      }
    } catch (error) {
      logger.error({ err: error, name: options.name }, 'rate-limit: Redis check failed — failing open (request allowed)');
    }
    next();
  };
}
