/**
 * Single source of truth for every backend service's local dev port/URL this app talks to.
 * Framework-agnostic (no Angular imports) so both the browser/SSR-shared `app-config.ts` and
 * the Node-only `server/bff/*` clients can import it without pulling Angular into the server
 * bundle or vice versa.
 *
 * Mirrors kart-devops/ports.env and kart-shared's `KartServiceEndpoints` (the .NET-side
 * equivalent of this same registry — see that file's own header comment) — change a port in
 * exactly one of those two places (whichever's a JSON/YAML/env file vs. compiled code) and
 * update this file to match.
 */
export const SERVICE_ENDPOINTS = {
  /** kart-identity-service's own local dev port (its launchSettings.json http profile). */
  identity: 'http://localhost:8081',
  /** kart-admin-service's own local dev port (its launchSettings.json http profile). */
  admin: 'http://localhost:8094',
  /** kart-api-gateway's own local dev port (its launchSettings.json http profile). */
  gateway: 'http://localhost:8100',
} as const;

/** kart-devops/ports.env's host-mapped port for its shared Redis container (6379 is commonly
 * already bound by a local Redis install) — point at `redis://localhost:6379` instead if you're
 * running your own standalone Redis. */
export const REDIS_LOCAL_URL = 'redis://localhost:6380';
