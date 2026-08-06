/**
 * Server-only client for kart-analytics-service's internal query API
 * (docs/services/kart-analytics-service/api-contract.yaml). Unlike every
 * other backend contract this app calls, Analytics is explicitly "internal
 * network segment only... never routed through the public API Gateway"
 * (that contract's own `servers` note) and secured by `internalClientCredentials`
 * (OAuth2 Client Credentials), not the end user's own session bearer token.
 *
 * requirement-spec.md §3.5 names this the "InternalBI consumer path" for
 * exactly this reason — this app's BFF is the internal consumer, obtaining
 * its own service-principal token via kart-identity-service's
 * `POST /v1/auth/token` (Client Credentials grant) and proxying dashboard
 * queries server-to-server; the browser never talks to Analytics directly
 * (`/api/bff/analytics/*` routes in routes.ts are the only browser-reachable
 * surface for AUD-2).
 */
import { logger } from '../logger';
import { SERVICE_ENDPOINTS } from '../../app/core/config/service-endpoints';

// kart-analytics-service is still an unscaffolded stub (no code yet) — it has no entry in
// SERVICE_ENDPOINTS/kart-devops/ports.env since no canonical port has been assigned yet; this
// literal fallback is a placeholder, not a copy of a value that exists anywhere else.
const ANALYTICS_SERVICE_BASE_URL = process.env['ANALYTICS_SERVICE_BASE_URL'] ?? 'http://localhost:5295';
const IDENTITY_SERVICE_BASE_URL = process.env['IDENTITY_SERVICE_BASE_URL'] ?? SERVICE_ENDPOINTS.identity;
const ANALYTICS_CLIENT_ID = process.env['ANALYTICS_CLIENT_ID'] ?? '';
const ANALYTICS_CLIENT_SECRET = process.env['ANALYTICS_CLIENT_SECRET'] ?? '';

let cachedToken: { accessToken: string; expiresAtMs: number } | null = null;

async function getServiceToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now() + 5_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: ANALYTICS_CLIENT_ID,
    client_secret: ANALYTICS_CLIENT_SECRET,
  });
  const tokenUrl = `${IDENTITY_SERVICE_BASE_URL}/v1/auth/token`;
  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (error) {
    logger.error(
      { err: error, url: tokenUrl },
      'analyticsClient: service-token request threw — is kart-identity-service unreachable?',
    );
    throw error;
  }
  const token = (await response.json()) as { accessToken: string; expiresIn: number };
  cachedToken = { accessToken: token.accessToken, expiresAtMs: Date.now() + token.expiresIn * 1_000 };
  return cachedToken.accessToken;
}

export async function fetchAnalytics<T>(path: string, query: Record<string, string | undefined>): Promise<{ status: number; body: T }> {
  const accessToken = await getServiceToken();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }
  const url = `${ANALYTICS_SERVICE_BASE_URL}${path}?${params.toString()}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    logger.error({ err: error, url }, 'analyticsClient: request threw — is kart-analytics-service unreachable?');
    throw error;
  }
  const responseBody = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body: responseBody };
}
