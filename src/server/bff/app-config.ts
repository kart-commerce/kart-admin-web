/**
 * Server-side mirror of `src/app/core/config/app-config.ts`'s shape — kept
 * as a plain, dependency-free type here (no Angular imports in server code).
 * Served verbatim to the browser at `GET /api/bff/config`.
 */
import { SERVICE_ENDPOINTS } from '../../app/core/config/service-endpoints';

export interface AppConfig {
  readonly gatewayBaseUrl: string;
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
