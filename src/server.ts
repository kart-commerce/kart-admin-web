import express, { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';

import { bffRouter } from './server/bff/routes';
import { securityHeaders } from './server/bff/security-headers';

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

app.use(securityHeaders);
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // SAML ACS posts SAMLResponse as application/x-www-form-urlencoded
app.use('/api/bff', bffRouter);

/**
 * Single error-handling boundary for the BFF routes (kart-conventions.md's
 * "one log per exception, never a leaked stack trace" rule) — a downstream
 * failure (e.g. kart-identity-service unreachable) becomes a generic
 * Problem-shaped 502, never Express's default HTML error page with a raw
 * stack trace.
 */
app.use('/api/bff', (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error('BFF request failed', { path: req.path, error });
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
  console.log(`kart-admin-web BFF listening on http://localhost:${port}`);
});
