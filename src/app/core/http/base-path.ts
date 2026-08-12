import { InjectionToken } from '@angular/core';

/**
 * Base path every generated client under `core/http/generated` reads. This
 * app is CSR-only (no SSR context, unlike kart-web) and, unlike kart-web,
 * has no public/anonymous surface at all — it's an "internal,
 * authenticated-only SPA" (README.md), so every one of these clients'
 * calls needs the session's bearer token attached, and the browser itself
 * never holds that token (security.md's BFF pattern). The browser therefore
 * always calls same-origin `/api/bff/gateway/v1`, the BFF's token-relay
 * proxy (`server/bff/gateway-proxy.ts`, mounted in `server.ts`), which
 * attaches `Authorization: Bearer <session token>` server-side and forwards
 * to kart-api-gateway — never same-origin `/v1` directly, which would reach
 * the gateway with no `Authorization` header and 401 (`AuthenticationExtensions`'s
 * JWT-bearer requirement on every `/v1/*` route). A single fixed default (no
 * server/browser branching) is still correct here, same as before.
 */
export const GATEWAY_BASE_PATH = new InjectionToken<string>('GATEWAY_BASE_PATH', {
  providedIn: 'root',
  factory: () => '/api/bff/gateway/v1',
});
