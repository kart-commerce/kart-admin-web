import express, { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';

import { gatewayProxyRouter } from './server/bff/gateway-proxy';
import { bffRouter } from './server/bff/routes';
import { securityHeaders } from './server/bff/security-headers';
import { logger } from './server/logger';

/**
 * This app is CSR-only (architecture.md §2 — no SSR tier), so unlike
 * kart-web's server.ts there is no AngularNodeAppEngine here — this is a
 * thin session-broker (security.md §1) that serves the static browser build
 * and falls back to index.html for client-side routing, with the BFF
 * mounted ahead of both. Bundled separately from the Angular build itself
 * (esbuild, `npm run build:bff` — see package.json) since this app has no
 * `ssr`/`server` architect target for the CLI to compile this from.
 *
 * Deployed as a sibling of the `browser/` output the Angular CLI produces
 * (`dist/kart-admin-web/{browser,server}/`) — this file is bundled to
 * `dist/kart-admin-web/server/server.mjs`, so `../browser` resolves to the
 * static build.
 */
const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

/**
 * Express's own `trust proxy` setting — governs `req.ip` (used by `rate-limit-middleware.ts` to
 * key login/refresh throttling per caller). Defaults to `false` (trust nothing, use the literal
 * socket address) rather than guessing a hop count, since trusting a spoofable
 * `X-Forwarded-For` header with no reverse proxy actually in front of this process would let any
 * caller forge their own rate-limit identity for free. Set `TRUST_PROXY` to the number of
 * reverse-proxy hops in front of this process in any real deployment (typically `1` for a single
 * ingress/load balancer) — Express accepts a hop count, `true`/`false`, or a CSV of trusted
 * IPs/subnets, all supported here by passing the env value straight through.
 */
function resolveTrustProxySetting(value: string | undefined): boolean | number | string {
  if (!value) {
    return false;
  }
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  const hops = Number(value);
  return Number.isFinite(hops) ? hops : value;
}
app.set('trust proxy', resolveTrustProxySetting(process.env['TRUST_PROXY']));

app.use(securityHeaders);
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // SAML ACS posts SAMLResponse as application/x-www-form-urlencoded
app.use('/api/bff', bffRouter);
app.use('/api/bff/gateway', gatewayProxyRouter);

/**
 * Single error-handling boundary for the BFF routes (kart-conventions.md's
 * "one log per exception, never a leaked stack trace" rule) — a downstream
 * failure (e.g. kart-identity-service unreachable) becomes a generic
 * Problem-shaped 502, never Express's default HTML error page with a raw
 * stack trace.
 */
app.use('/api/bff', (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: error, path: req.path }, 'BFF request failed');
  res.status(502).json({ code: 'upstream_unavailable', message: 'A dependent service is unavailable.' });
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// SPA fallback — every remaining GET (this app's own client-side routes) serves index.html.
// path-to-regexp v8's `*name` wildcard requires >=1 segment, so bare '/*splat' never matches the
// site root itself; '{*splat}' makes the segment optional so '/' falls through here too.
app.get('/{*splat}', (_req, res) => {
  res.sendFile(join(browserDistFolder, 'index.html'));
});

const port = process.env['PORT'] || 4000;
app.listen(port, () => {
  logger.info({ port }, `kart-admin-web BFF listening on http://localhost:${port}`);
});
