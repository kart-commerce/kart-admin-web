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
import { ABSOLUTE_CAP_HOURS, sessionStore, StoredSession } from './session-store';

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

bffRouter.post('/auth/native/login', async (req, res) => {
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

bffRouter.post('/auth/native/mfa/verify', async (req, res) => {
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

bffRouter.post('/auth/refresh', async (req, res) => {
  const current = await readCurrentSession(req);
  if (!current) {
    res.status(401).json({ code: 'no_session', message: 'No active session to refresh.' });
    return;
  }

  const { status, body } = await identityClient.refresh({ refreshToken: current.session.refreshToken });

  if (status !== 200) {
    // Reuse-detected (401, whole family revoked) or otherwise unrecoverable — drop the local session too.
    await sessionStore.destroy(current.sessionId);
    res.setHeader('Set-Cookie', serializeClearedSessionCookie());
    res.status(status).json(body);
    return;
  }

  const tokenPair = body as TokenPair;
  const updated: StoredSession = {
    ...current.session,
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
  };
  await sessionStore.save(current.sessionId, updated);
  res.json(toSessionInfo(updated));
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
