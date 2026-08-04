import { describe, expect, it, vi } from 'vitest';
import { Request, Response } from 'express';

import { securityHeaders } from './security-headers';

function mockResponse(): Response {
  return { setHeader: vi.fn() } as unknown as Response;
}

describe('securityHeaders', () => {
  it('sets a CSP forbidding framing and inline scripts', () => {
    const res = mockResponse();
    securityHeaders({} as Request, res, vi.fn());

    const csp = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(([name]) => name === 'Content-Security-Policy')?.[1] as string;
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe-inline\'; script-src');
  });

  it('sets X-Frame-Options, nosniff, and a Referrer-Policy', () => {
    const res = mockResponse();
    securityHeaders({} as Request, res, vi.fn());

    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
  });

  it('calls next() so the request continues', () => {
    const next = vi.fn();
    securityHeaders({} as Request, mockResponse(), next);
    expect(next).toHaveBeenCalledOnce();
  });
});
