import { InjectionToken } from '@angular/core';

import { SERVICE_ENDPOINTS } from './service-endpoints';

/**
 * Runtime, environment-driven configuration. This app is CSR-only
 * (architecture.md §2 — no SSR tier), so there is no TransferState hydration
 * path the way kart-web has; the thin BFF session-broker (server/bff) serves
 * this shape from its own process.env at `GET /api/bff/config`, and the
 * browser fetches it once at bootstrap (app-config.provider.ts). Only values
 * safe to expose to the browser belong here — session tokens never do (see
 * core/auth's BFF session design, security.md §1).
 */
export interface AppConfig {
  /**
   * Base URL of kart-api-gateway, this app's only sync backend dependency
   * (architecture.md Dependencies table) — every generated client under
   * core/http/generated reads its base path from this value. The browser
   * itself calls same-origin `/v1` (proxied to the gateway by the dev server
   * or a reverse proxy in deployed environments, same as kart-web) rather
   * than this URL directly, to avoid needing CORS headers the gateway
   * doesn't send today.
   */
  readonly gatewayBaseUrl: string;
  /** Role-split idle-session policy (security.md §2.2) — not user-editable, surfaced for the session state machine. */
  readonly session: {
    readonly idleTimeoutMinutes: { readonly admin: number; readonly support_agent: number };
    readonly absoluteCapHours: { readonly admin: number; readonly support_agent: number };
    readonly idleWarningSeconds: number;
    readonly absoluteCapWarningMinutes: number;
  };
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  gatewayBaseUrl: SERVICE_ENDPOINTS.gateway,
  session: {
    idleTimeoutMinutes: { admin: 15, support_agent: 20 },
    absoluteCapHours: { admin: 24, support_agent: 8 },
    idleWarningSeconds: 60,
    absoluteCapWarningMinutes: 5,
  },
};

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
