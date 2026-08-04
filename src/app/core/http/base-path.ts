import { InjectionToken } from '@angular/core';

/**
 * Base path every generated client under `core/http/generated` reads. This
 * app is CSR-only (no SSR context, unlike kart-web) — the browser always
 * calls same-origin `/v1`, proxied to kart-api-gateway by the dev server
 * (`proxy.conf.json`) or a reverse proxy in deployed environments, so a
 * single fixed default (no server/browser branching) is correct here.
 */
export const GATEWAY_BASE_PATH = new InjectionToken<string>('GATEWAY_BASE_PATH', {
  providedIn: 'root',
  factory: () => '/v1',
});
