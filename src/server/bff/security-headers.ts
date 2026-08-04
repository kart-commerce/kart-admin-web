import { NextFunction, Request, Response } from 'express';

/**
 * security.md §4 (OWASP ASVS V14 — Configuration): CSP per app, no inline
 * scripts/styles without a nonce, `Referrer-Policy:
 * strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`,
 * `X-Frame-Options: DENY` — "kart-admin-web additionally blocks framing
 * unconditionally given its elevated-privilege surface has no legitimate
 * embed use case." Applied to every response (BFF routes, static assets,
 * and the SPA fallback alike) as the first middleware in server.ts.
 *
 * `style-src 'unsafe-inline'` is the one deliberate exception: Angular
 * injects component styles as runtime `<style>` tags, and a nonce-based CSP
 * for that would require per-request HTML templating this static-file-served
 * SPA doesn't do. `script-src` has no such exception — `index.html`'s own
 * theme-bootstrap script was moved to `public/theme-init.js` specifically so
 * `script-src` never needs `'unsafe-inline'` either.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Only meaningful over HTTPS; harmless no-op over plain http:// local dev.
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  next();
}
