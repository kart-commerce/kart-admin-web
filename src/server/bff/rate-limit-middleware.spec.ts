import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

vi.mock('./rate-limiter', () => ({
  rateLimiter: { consume: vi.fn() },
}));

function mockRes(): Response {
  return {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('rateLimit middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() when the limiter allows the request', async () => {
    const { rateLimiter } = await import('./rate-limiter');
    (rateLimiter.consume as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    const { rateLimit } = await import('./rate-limit-middleware');

    const middleware = rateLimit({ name: 'test', limit: 10, windowSeconds: 60 });
    const req = { ip: '1.2.3.4', headers: {}, socket: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 429 with Retry-After when the limiter rejects the request', async () => {
    const { rateLimiter } = await import('./rate-limiter');
    (rateLimiter.consume as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: false, retryAfterSeconds: 42 });
    const { rateLimit } = await import('./rate-limit-middleware');

    const middleware = rateLimit({ name: 'test', limit: 10, windowSeconds: 60 });
    const req = { ip: '1.2.3.4', headers: {}, socket: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '42');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'rate_limited' }));
  });

  it('fails open (calls next()) when the Redis check itself throws', async () => {
    const { rateLimiter } = await import('./rate-limiter');
    (rateLimiter.consume as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ECONNREFUSED'));
    const { rateLimit } = await import('./rate-limit-middleware');

    const middleware = rateLimit({ name: 'test', limit: 10, windowSeconds: 60 });
    const req = { ip: '1.2.3.4', headers: {}, socket: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('uses a custom keyFn (e.g. session-or-IP) instead of the caller IP when provided', async () => {
    const { rateLimiter } = await import('./rate-limiter');
    (rateLimiter.consume as ReturnType<typeof vi.fn>).mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    const { rateLimit } = await import('./rate-limit-middleware');

    const keyFn = vi.fn().mockReturnValue('session-42');
    const middleware = rateLimit({ name: 'refresh', limit: 30, windowSeconds: 60, keyFn });
    const req = { ip: '1.2.3.4', headers: {}, socket: {} } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(keyFn).toHaveBeenCalledWith(req);
    expect(rateLimiter.consume).toHaveBeenCalledWith(expect.stringContaining('session-42'), 30, 60);
  });
});

describe('sessionOrIpKey', () => {
  it('returns the session id from the cookie when present', async () => {
    const { sessionOrIpKey } = await import('./rate-limit-middleware');
    const req = { headers: { cookie: 'kart_admin_session=abc123' }, ip: '1.2.3.4', socket: {} } as unknown as Request;

    expect(sessionOrIpKey(req)).toBe('abc123');
  });

  it('falls back to the caller IP with no session cookie', async () => {
    const { sessionOrIpKey } = await import('./rate-limit-middleware');
    const req = { headers: {}, ip: '1.2.3.4', socket: {} } as unknown as Request;

    expect(sessionOrIpKey(req)).toBe('1.2.3.4');
  });
});
