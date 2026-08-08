import { randomBytes } from 'node:crypto';
import { Request, Response, Router } from 'express';

import { adminServiceClient } from './admin-service-client';
import { fetchAnalytics } from './analytics-client';
import { AppConfig, DEFAULT_APP_CONFIG } from './app-config';
import { serializeClearedSessionCookie, serializeSessionCookie, readSessionId } from './cookie';
import {
  ENTERPRISE_IDP_ALIAS,
  MfaChallenge,
  Problem,
  Role,
  TokenPair,
  identityClient,
} from './identity-client';
import { decodeJwtPayload, KartAccessTokenClaims } from './jwt';
import { logger } from '../logger';
import { rateLimit, sessionOrIpKey } from './rate-limit-middleware';
import { ABSOLUTE_CAP_HOURS, sessionStore, StoredSession } from './session-store';

/**
 * Abuse backstops for the auth endpoints (security.md's threat model — credential stuffing
 * against native login, refresh-storm DoS against `/auth/refresh`). Limits are per-IP for
 * login/MFA (an unauthenticated caller has no session to key off yet) and per-session for
 * refresh (see `sessionOrIpKey`'s own doc comment for why). Tunable without a redeploy isn't
 * needed yet — these are generous enough that no legitimate user should ever see a 429 (a
 * human retrying a typo'd password a few times, or this app's own proactive-plus-reactive
 * refresh combo, both stay far under these) while still bounding worst-case abuse load.
 */
const LOGIN_RATE_LIMIT = rateLimit({ name: 'login', limit: 10, windowSeconds: 60 });
const MFA_RATE_LIMIT = rateLimit({ name: 'mfa', limit: 10, windowSeconds: 60 });
const REFRESH_RATE_LIMIT = rateLimit({ name: 'refresh', limit: 30, windowSeconds: 60, keyFn: sessionOrIpKey });

/**
 * BFF auth/session core (AUTH-1/AUTH-2/AUTH-3/AUTH-4). Every route here is
 * same-origin (`/api/bff/*`) and is the *only* thing that ever holds or
 * handles an identity-service access/refresh token or an
 * kart-admin-service-issued grant list — the browser only ever sees the
 * shapes in `core/auth/models.ts`.
 */
export const bffRouter = Router();

/** Only Admin/Support Agent may hold a session in this app — a customer or partner_api token is not a valid role here. */
const ELEVATED_ROLES: readonly Role[] = ['admin', 'support_agent'];

function resolveElevatedRole(roles: readonly Role[] | undefined): Role | null {
  return ELEVATED_ROLES.find((role) => roles?.includes(role)) ?? null;
}

function toSessionInfo(stored: StoredSession | null) {
  if (!stored) {
    return {
      authenticated: false,
      role: null,
      principalId: null,
      grants: [],
      grantsDegraded: false,
      loginAt: null,
      absoluteCapAt: null,
      accessTokenExpiresAt: null,
    };
  }
  return {
    authenticated: true,
    role: stored.role,
    principalId: stored.principalId,
    grants: stored.grants,
    grantsDegraded: stored.grantsDegraded,
    loginAt: stored.loginAt,
    absoluteCapAt: stored.absoluteCapAt,
    accessTokenExpiresAt: stored.accessTokenExpiresAt,
  };
}

async function readCurrentSession(req: Request): Promise<{ sessionId: string; session: StoredSession } | null> {
  const sessionId = readSessionId(req.headers.cookie);
  if (!sessionId) {
    return null;
  }
  const session = await sessionStore.get(sessionId);
  return session ? { sessionId, session } : null;
}

/** A little slack subtracted from identity-service's own `expiresIn` so this server's clock never optimistically treats a token as valid a moment after it has actually expired upstream (clock skew / request latency). */
const ACCESS_TOKEN_EXPIRY_SKEW_MS = 5_000;

function accessTokenExpiresAt(tokenPair: TokenPair): string {
  return new Date(Date.now() + tokenPair.expiresIn * 1000 - ACCESS_TOKEN_EXPIRY_SKEW_MS).toISOString();
}

/** Establishes a new BFF session from a freshly-issued TokenPair, rejecting a role this app has no use for. */
async function establishSession(res: Response, tokenPair: TokenPair): Promise<StoredSession | null> {
  const claims = decodeJwtPayload<KartAccessTokenClaims>(tokenPair.accessToken);
  const role = resolveElevatedRole(tokenPair.roles ?? claims?.roles as Role[] | undefined);
  if (!role || !claims?.sub) {
    return null;
  }

  const { categories: grants, degraded: grantsDegraded } = await adminServiceClient.listOwnGrantCategories(
    tokenPair.accessToken,
    claims.sub,
  );
  const { sessionId, stored } = await sessionStore.create({
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    role,
    principalId: claims.sub,
    grants,
    grantsDegraded,
    accessTokenExpiresAt: accessTokenExpiresAt(tokenPair),
  });
  res.setHeader('Set-Cookie', serializeSessionCookie(sessionId, ABSOLUTE_CAP_HOURS[role] * 60 * 60));
  return stored;
}

bffRouter.get('/session', async (req, res) => {
  const current = await readCurrentSession(req);
  res.json(toSessionInfo(current?.session ?? null));
});

bffRouter.get('/config', (_req, res) => {
  const config: AppConfig = {
    ...DEFAULT_APP_CONFIG,
    gatewayBaseUrl: process.env['GATEWAY_BASE_URL'] ?? DEFAULT_APP_CONFIG.gatewayBaseUrl,
  };
  res.json(config);
});

bffRouter.post('/auth/native/login', LOGIN_RATE_LIMIT, async (req, res) => {
  const { status, body } = await identityClient.login(req.body);

  if (status === 200) {
    const stored = await establishSession(res, body as TokenPair);
    if (!stored) {
      res.status(403).json({ code: 'role_not_supported', message: 'This account has no Admin/Support Agent role.' });
      return;
    }
    res.json({ status: 'authenticated', session: toSessionInfo(stored) });
    return;
  }

  if (status === 202) {
    res.status(202).json({ status: 'mfa-required', challenge: body as MfaChallenge });
    return;
  }

  res.status(status).json(body as Problem);
});

bffRouter.post('/auth/native/mfa/verify', MFA_RATE_LIMIT, async (req, res) => {
  const { status, body } = await identityClient.verifyMfa(req.body);
  if (status !== 200) {
    res.status(status).json(body);
    return;
  }
  const stored = await establishSession(res, body as TokenPair);
  if (!stored) {
    res.status(403).json({ code: 'role_not_supported', message: 'This account has no Admin/Support Agent role.' });
    return;
  }
  res.json(toSessionInfo(stored));
});

/**
 * `/auth/refresh` concurrency and failure-mode hardening (AUTH-3). Two distinct hazards, both of
 * which must never destroy a session that is actually still good:
 *
 * 1. **Concurrent redemption.** identity-service's refresh token is single-use/rotating (see
 *    this file's `refresh_reuse_detected` test), so at most one caller may ever be mid-flight
 *    redeeming a given session's refresh token. A browser tab firing several requests at once —
 *    all 401ing together right as the access token expires — must not turn into several
 *    *independent* redemptions: the second to reach identity-service would look like reuse of an
 *    already-rotated token. This is coalesced two ways, cheapest first:
 *      a) an in-process `Map` — free, handles the overwhelmingly common case (one pod, several
 *         requests in the same event loop tick);
 *      b) a Redis-backed lock (`sessionStore.acquireRefreshLock`) — handles the case the `Map`
 *         can't: two requests for the same session landing on two different BFF pods behind a
 *         load balancer with no session affinity. A loser waits on the winner's result rather
 *         than racing it (`awaitConcurrentRefresh`) instead of calling identity-service itself.
 *
 * 2. **Transient upstream failure.** Only identity-service's own 401 (invalid/expired/reused
 *    refresh token) means the session is *actually* dead. A 5xx, a rate-limit, a network
 *    blip, or this call throwing outright are transient — identity-service having a bad moment
 *    must never force a fleet-wide wave of otherwise-valid sessions into a full re-login. Those
 *    cases leave the stored session untouched and report `refresh_temporarily_unavailable` so
 *    the caller (the interceptor's own catchError, or the next natural 401) can just try again.
 */
const refreshInFlight = new Map<string, Promise<{ status: number; body: unknown }>>();

const REFRESH_LOCK_POLL_INTERVAL_MS = 100;
/** How long a loser waits on another pod's in-flight refresh before giving up and reporting transient failure — well under the lock's own TTL plus one full poll cycle of slack. */
const REFRESH_LOCK_MAX_WAIT_MS = 8_000;

const TRANSIENT_REFRESH_PROBLEM = {
  code: 'refresh_temporarily_unavailable',
  message: 'Could not refresh the session right now. Please retry.',
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True only for identity-service's own definitive "this refresh token is invalid/expired/reused" signal — the one case where tearing the session down is actually correct. */
function isRefreshRejected(status: number): boolean {
  return status === 401;
}

async function redeemRefreshToken(sessionId: string, session: StoredSession): Promise<{ status: number; body: unknown }> {
  let result: { status: number; body: unknown };
  try {
    result = await identityClient.refresh({ refreshToken: session.refreshToken });
  } catch (error) {
    logger.error({ err: error, sessionId }, 'auth/refresh: identityClient.refresh threw — treating as transient');
    return { status: 503, body: TRANSIENT_REFRESH_PROBLEM };
  }

  if (result.status === 200) {
    const tokenPair = result.body as TokenPair;
    const updated: StoredSession = {
      ...session,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt(tokenPair),
    };
    await sessionStore.save(sessionId, updated);
    return { status: 200, body: toSessionInfo(updated) };
  }

  if (isRefreshRejected(result.status)) {
    await sessionStore.destroy(sessionId);
    return result;
  }

  // Anything else (5xx, 429, a malformed response) — presumed transient; the session and its
  // still-current refresh token are left exactly as they were.
  logger.warn({ sessionId, status: result.status }, 'auth/refresh: identity-service returned a non-401 failure — treating as transient, session preserved');
  return { status: 503, body: TRANSIENT_REFRESH_PROBLEM };
}

/**
 * Called by a request that lost the cross-instance lock race. Rather than attempting its own
 * redemption (which would trip identity-service's reuse detection), it polls the shared session
 * record for the outcome the lock-holder is about to (or just did) produce.
 */
async function awaitConcurrentRefresh(sessionId: string, staleSession: StoredSession): Promise<{ status: number; body: unknown }> {
  const deadline = Date.now() + REFRESH_LOCK_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(REFRESH_LOCK_POLL_INTERVAL_MS);
    const latest = await sessionStore.get(sessionId);
    if (!latest) {
      // The winning redemption found the refresh token genuinely invalid/reused and tore the
      // session down — that outcome applies to this caller too.
      return { status: 401, body: { code: 'refresh_failed', message: 'Session is no longer valid.' } };
    }
    if (latest.accessToken !== staleSession.accessToken || latest.refreshToken !== staleSession.refreshToken) {
      // The winner rotated the tokens — this caller's request is satisfied by that outcome too.
      return { status: 200, body: toSessionInfo(latest) };
    }
  }
  // The lock holder hasn't published a result within a generous window (it may have died — the
  // lock's own TTL will free it up shortly). Never destroy the session on a timeout: it may well
  // still be perfectly valid.
  logger.warn({ sessionId }, 'auth/refresh: timed out waiting on a concurrent refresh held by another instance');
  return { status: 503, body: TRANSIENT_REFRESH_PROBLEM };
}

async function refreshWithDistributedLock(sessionId: string, session: StoredSession): Promise<{ status: number; body: unknown }> {
  const fencingToken = randomBytes(16).toString('hex');
  const acquired = await sessionStore.acquireRefreshLock(sessionId, fencingToken);

  if (!acquired) {
    return awaitConcurrentRefresh(sessionId, session);
  }

  try {
    return await redeemRefreshToken(sessionId, session);
  } finally {
    await sessionStore.releaseRefreshLock(sessionId, fencingToken);
  }
}

/** In-process fast path in front of the distributed lock — free, and covers the common single-pod case without a single extra Redis round trip. */
function coalescedRefresh(sessionId: string, session: StoredSession): Promise<{ status: number; body: unknown }> {
  let pending = refreshInFlight.get(sessionId);
  if (!pending) {
    pending = refreshWithDistributedLock(sessionId, session).finally(() => refreshInFlight.delete(sessionId));
    refreshInFlight.set(sessionId, pending);
  }
  return pending;
}

bffRouter.post('/auth/refresh', REFRESH_RATE_LIMIT, async (req, res) => {
  const current = await readCurrentSession(req);
  if (!current) {
    res.status(401).json({ code: 'no_session', message: 'No active session to refresh.' });
    return;
  }

  const { status, body } = await coalescedRefresh(current.sessionId, current.session);
  if (isRefreshRejected(status)) {
    res.setHeader('Set-Cookie', serializeClearedSessionCookie());
  }
  res.status(status).json(body);
});

bffRouter.post('/auth/logout', async (req, res) => {
  const current = await readCurrentSession(req);
  if (current) {
    await identityClient
      .logout(current.session.accessToken, current.session.refreshToken)
      .catch(() => undefined);
    await sessionStore.destroy(current.sessionId);
  }
  res.setHeader('Set-Cookie', serializeClearedSessionCookie());
  res.status(204).end();
});

// ---------------------------------------------------------------------
// AUTH-1: Enterprise SSO federation (Admin). See identity-client.ts's
// enterpriseOidcCallback/enterpriseSamlAcs doc comments for the redirect_uri
// assumption both routes below rely on.
// ---------------------------------------------------------------------

bffRouter.get('/auth/sso/login', (_req: Request, res: Response) => {
  res.redirect(302, identityClient.enterpriseFederationStartUrl(ENTERPRISE_IDP_ALIAS));
});

bffRouter.get('/auth/sso/enterprise/callback', async (req: Request, res: Response) => {
  const code = String(req.query['code'] ?? '');
  const state = String(req.query['state'] ?? '');

  if (!code || !state) {
    res.redirect('/login?error=sso_failed');
    return;
  }

  const { status, body } = await identityClient.enterpriseOidcCallback(ENTERPRISE_IDP_ALIAS, { code, state });
  if (status !== 200) {
    res.redirect('/login?error=sso_failed');
    return;
  }

  const stored = await establishSession(res, body as TokenPair);
  res.redirect(stored ? '/' : '/login?error=role_not_supported');
});

bffRouter.post('/auth/sso/enterprise/saml/acs', async (req: Request, res: Response) => {
  const samlResponse = String(req.body?.SAMLResponse ?? '');
  const relayState = req.body?.RelayState ? String(req.body.RelayState) : undefined;

  if (!samlResponse) {
    res.redirect('/login?error=sso_failed');
    return;
  }

  const { status, body } = await identityClient.enterpriseSamlAcs(ENTERPRISE_IDP_ALIAS, {
    SAMLResponse: samlResponse,
    RelayState: relayState,
  });
  if (status !== 200) {
    res.redirect('/login?error=sso_failed');
    return;
  }

  const stored = await establishSession(res, body as TokenPair);
  res.redirect(stored ? '/' : '/login?error=role_not_supported');
});

// ---------------------------------------------------------------------
// AUD-2: Analytics/Compliance Dashboards. Proxied server-to-server since
// kart-analytics-service's internal query API is not reachable through the
// public gateway at all (its own contract's `servers` note) — see
// analytics-client.ts. Role-gated only (any Admin), matching AUD-1's own
// coarse role check, no per-category grant.
// ---------------------------------------------------------------------

const ANALYTICS_DASHBOARD_PATHS: Record<string, string> = {
  'order-conversion-funnel': '/internal/v1/funnels/order-conversion',
  revenue: '/internal/v1/dashboards/revenue',
  'fulfillment-performance': '/internal/v1/dashboards/fulfillment-performance',
  'inventory-movement': '/internal/v1/dashboards/inventory-movement',
  'catalog-pricing': '/internal/v1/dashboards/catalog-pricing',
  'promotions-effectiveness': '/internal/v1/dashboards/promotions-effectiveness',
  'user-growth': '/internal/v1/dashboards/user-growth',
  'reviews-ratings': '/internal/v1/dashboards/reviews-ratings',
  'admin-audit': '/internal/v1/dashboards/admin-audit',
  'notification-delivery': '/internal/v1/dashboards/notification-delivery',
};

async function requireAdminSession(req: Request, res: Response): Promise<StoredSession | null> {
  const current = await readCurrentSession(req);
  if (!current || current.session.role !== 'admin') {
    res.status(403).json({ code: 'role_required', message: 'This screen requires the Admin role.' });
    return null;
  }
  return current.session;
}

bffRouter.get('/analytics/dashboards/:name', async (req: Request, res: Response) => {
  if (!(await requireAdminSession(req, res))) {
    return;
  }

  const dashboardName = String(req.params['name']);
  const path = ANALYTICS_DASHBOARD_PATHS[dashboardName];
  if (!path) {
    res.status(404).json({ code: 'unknown_dashboard', message: `No dashboard named ${dashboardName}.` });
    return;
  }

  const { status, body } = await fetchAnalytics(path, {
    from: typeof req.query['from'] === 'string' ? req.query['from'] : undefined,
    to: typeof req.query['to'] === 'string' ? req.query['to'] : undefined,
    granularity: typeof req.query['granularity'] === 'string' ? req.query['granularity'] : undefined,
    sku: typeof req.query['sku'] === 'string' ? req.query['sku'] : undefined,
    category: typeof req.query['category'] === 'string' ? req.query['category'] : undefined,
    channel: typeof req.query['channel'] === 'string' ? req.query['channel'] : undefined,
    actionType: typeof req.query['actionType'] === 'string' ? req.query['actionType'] : undefined,
  });
  res.status(status).json(body);
});
