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
const ANALYTICS_SERVICE_BASE_URL = process.env['ANALYTICS_SERVICE_BASE_URL'] ?? 'http://localhost:5295';
const IDENTITY_SERVICE_BASE_URL = process.env['IDENTITY_SERVICE_BASE_URL'] ?? 'http://localhost:5200';
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
  const response = await fetch(`${IDENTITY_SERVICE_BASE_URL}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
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
  const response = await fetch(`${ANALYTICS_SERVICE_BASE_URL}${path}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const responseBody = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body: responseBody };
}
