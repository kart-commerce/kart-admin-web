import express from 'express';
import { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { adminServiceClient } from './admin-service-client';
import { fetchAnalytics } from './analytics-client';
import { identityClient } from './identity-client';
import { sessionStore } from './session-store';

vi.mock('./identity-client', async () => {
  const actual = await vi.importActual<typeof import('./identity-client')>('./identity-client');
  return {
    ...actual,
    identityClient: {
      login: vi.fn(),
      verifyMfa: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn().mockResolvedValue({ status: 204, body: undefined }),
      enterpriseFederationStartUrl: vi.fn((alias: string) => `https://idp.example/${alias}/login`),
      enterpriseOidcCallback: vi.fn(),
      enterpriseSamlAcs: vi.fn(),
    },
  };
});

vi.mock('./admin-service-client', () => ({
  adminServiceClient: { listOwnGrantCategories: vi.fn().mockResolvedValue([]) },
}));

vi.mock('./analytics-client', () => ({
  fetchAnalytics: vi.fn(),
}));

vi.mock('./session-store', async () => {
  const actual = await vi.importActual<typeof import('./session-store')>('./session-store');
  const memory = new Map<string, unknown>();
  return {
    ...actual,
    sessionStore: {
      create: vi.fn(async (session: Record<string, unknown>) => {
        const sessionId = `session-${memory.size + 1}`;
        const stored = { ...session, loginAt: new Date().toISOString(), absoluteCapAt: new Date(Date.now() + 3_600_000).toISOString() };
        memory.set(sessionId, stored);
        return { sessionId, stored };
      }),
      get: vi.fn(async (sessionId: string) => memory.get(sessionId) ?? null),
      save: vi.fn(async (sessionId: string, session: unknown) => {
        memory.set(sessionId, session);
      }),
      destroy: vi.fn(async (sessionId: string) => {
        memory.delete(sessionId);
      }),
    },
    __memory: memory,
  };
});

function jwtWith(claims: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.signature`;
}

const ADMIN_TOKEN_PAIR = {
  accessToken: jwtWith({ sub: 'admin-1', roles: ['admin'] }),
  refreshToken: 'refresh-1',
  tokenType: 'Bearer',
  expiresIn: 900,
  roles: ['admin'] as const,
};

describe('bffRouter', () => {
  let baseUrl: string;
  let server: ReturnType<express.Express['listen']>;

  beforeAll(async () => {
    const { bffRouter } = await import('./routes');
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use('/api/bff', bffRouter);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}/api/bff`;
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('GET /session returns unauthenticated with no cookie', async () => {
    const res = await fetch(`${baseUrl}/session`);
    const body = await res.json();
    expect(body).toEqual({ authenticated: false, role: null, principalId: null, grants: [], loginAt: null, absoluteCapAt: null });
  });

  it('POST /auth/native/login establishes a session on a 200 TokenPair', async () => {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: ADMIN_TOKEN_PAIR });

    const res = await fetch(`${baseUrl}/auth/native/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('authenticated');
    expect(body.session.role).toBe('admin');
    expect(res.headers.get('set-cookie')).toContain('kart_admin_session=');
  });

  it('POST /auth/native/login surfaces a 202 MFA challenge without a cookie', async () => {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 202,
      body: { challengeId: 'c1', expiresInSeconds: 300 },
    });

    const res = await fetch(`${baseUrl}/auth/native/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(body).toEqual({ status: 'mfa-required', challenge: { challengeId: 'c1', expiresInSeconds: 300 } });
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('POST /auth/native/login rejects a token whose role this app has no use for', async () => {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      body: { ...ADMIN_TOKEN_PAIR, accessToken: jwtWith({ sub: 'cust-1', roles: ['customer'] }), roles: ['customer'] },
    });

    const res = await fetch(`${baseUrl}/auth/native/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('role_not_supported');
  });

  it('POST /auth/native/login passes through a Problem on invalid credentials', async () => {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 401,
      body: { code: 'invalid_credentials', message: 'Bad email or password.' },
    });

    const res = await fetch(`${baseUrl}/auth/native/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'wrong' }),
    });

    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('invalid_credentials');
  });

  it('logs in, then GET /session reflects the established session via the cookie', async () => {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: ADMIN_TOKEN_PAIR });

    const loginRes = await fetch(`${baseUrl}/auth/native/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];

    const sessionRes = await fetch(`${baseUrl}/session`, { headers: { Cookie: cookie ?? '' } });
    const body = await sessionRes.json();

    expect(body.authenticated).toBe(true);
    expect(body.principalId).toBe('admin-1');
  });

  it('POST /auth/native/mfa/verify establishes a session on success', async () => {
    (identityClient.verifyMfa as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: ADMIN_TOKEN_PAIR });

    const res = await fetch(`${baseUrl}/auth/native/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: 'c1', totpCode: '123456' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.authenticated).toBe(true);
  });

  it('POST /auth/native/mfa/verify passes through an incorrect-code Problem', async () => {
    (identityClient.verifyMfa as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 401,
      body: { code: 'invalid_code', message: 'Incorrect code.' },
    });

    const res = await fetch(`${baseUrl}/auth/native/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: 'c1', totpCode: '000000' }),
    });

    expect(res.status).toBe(401);
  });

  it('POST /auth/refresh with no cookie returns 401', async () => {
    const res = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST' });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('no_session');
  });

  it('POST /auth/refresh rotates tokens and keeps the session', async () => {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: ADMIN_TOKEN_PAIR });
    const loginRes = await fetch(`${baseUrl}/auth/native/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];

    (identityClient.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      body: { accessToken: 'new-access', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900 },
    });

    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie ?? '' } });
    expect(refreshRes.status).toBe(200);
    expect((await refreshRes.json()).authenticated).toBe(true);
  });

  it('POST /auth/refresh clears the session cookie when the refresh token was reused/revoked', async () => {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: ADMIN_TOKEN_PAIR });
    const loginRes = await fetch(`${baseUrl}/auth/native/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];

    (identityClient.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 401,
      body: { code: 'refresh_reuse_detected', message: 'Session revoked.' },
    });

    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie ?? '' } });
    expect(refreshRes.status).toBe(401);
    expect(refreshRes.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('POST /auth/logout clears the cookie regardless of whether a session existed', async () => {
    const res = await fetch(`${baseUrl}/auth/logout`, { method: 'POST' });
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('GET /auth/sso/login redirects to the enterprise IdP', async () => {
    const res = await fetch(`${baseUrl}/auth/sso/login`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('idp.example');
  });

  it('GET /auth/sso/enterprise/callback redirects to login on a failed federation attempt', async () => {
    (identityClient.enterpriseOidcCallback as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 401,
      body: { code: 'invalid_assertion', message: 'Invalid.' },
    });

    const res = await fetch(`${baseUrl}/auth/sso/enterprise/callback?code=abc&state=xyz`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login?error=sso_failed');
  });

  it('GET /auth/sso/enterprise/callback redirects home on a successful federation attempt', async () => {
    (identityClient.enterpriseOidcCallback as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: ADMIN_TOKEN_PAIR });

    const res = await fetch(`${baseUrl}/auth/sso/enterprise/callback?code=abc&state=xyz`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/');
  });

  it('GET /auth/sso/enterprise/callback redirects to login when code/state are missing', async () => {
    const res = await fetch(`${baseUrl}/auth/sso/enterprise/callback`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login?error=sso_failed');
    expect(identityClient.enterpriseOidcCallback).not.toHaveBeenCalled();
  });

  it('POST /auth/sso/enterprise/saml/acs redirects to login when SAMLResponse is missing', async () => {
    const res = await fetch(`${baseUrl}/auth/sso/enterprise/saml/acs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: '',
      redirect: 'manual',
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login?error=sso_failed');
    expect(identityClient.enterpriseSamlAcs).not.toHaveBeenCalled();
  });

  it('POST /auth/sso/enterprise/saml/acs redirects to login when the assertion is rejected', async () => {
    (identityClient.enterpriseSamlAcs as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 401,
      body: { code: 'invalid_assertion', message: 'Signature verification failed.' },
    });

    const res = await fetch(`${baseUrl}/auth/sso/enterprise/saml/acs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'SAMLResponse=encoded-assertion&RelayState=state-1',
      redirect: 'manual',
    });

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login?error=sso_failed');
  });

  it('POST /auth/sso/enterprise/saml/acs establishes a session and redirects home on success', async () => {
    (identityClient.enterpriseSamlAcs as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: ADMIN_TOKEN_PAIR });

    const res = await fetch(`${baseUrl}/auth/sso/enterprise/saml/acs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'SAMLResponse=encoded-assertion&RelayState=state-1',
      redirect: 'manual',
    });

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/');
    expect(identityClient.enterpriseSamlAcs).toHaveBeenCalledWith('okta', {
      SAMLResponse: 'encoded-assertion',
      RelayState: 'state-1',
    });
    expect(res.headers.get('set-cookie')).toContain('kart_admin_session=');
  });

  it('GET /analytics/dashboards/:name requires an Admin session', async () => {
    const res = await fetch(`${baseUrl}/analytics/dashboards/revenue`);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('role_required');
  });

  it('GET /analytics/dashboards/:name proxies to fetchAnalytics for an Admin session', async () => {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: ADMIN_TOKEN_PAIR });
    const loginRes = await fetch(`${baseUrl}/auth/native/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];

    (fetchAnalytics as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: { generatedAt: 'now', isProvisional: false } });

    const res = await fetch(`${baseUrl}/analytics/dashboards/revenue?from=2026-01-01&to=2026-02-01`, {
      headers: { Cookie: cookie ?? '' },
    });

    expect(res.status).toBe(200);
    expect(fetchAnalytics).toHaveBeenCalledWith(
      '/internal/v1/dashboards/revenue',
      expect.objectContaining({ from: '2026-01-01', to: '2026-02-01' }),
    );
  });

  it('GET /analytics/dashboards/:name 404s for an unknown dashboard name', async () => {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: ADMIN_TOKEN_PAIR });
    const loginRes = await fetch(`${baseUrl}/auth/native/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });
    const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];

    const res = await fetch(`${baseUrl}/analytics/dashboards/not-a-real-dashboard`, { headers: { Cookie: cookie ?? '' } });
    expect(res.status).toBe(404);
  });

  it('GET /config returns the gateway base URL', async () => {
    const res = await fetch(`${baseUrl}/config`);
    const body = await res.json();
    expect(body.gatewayBaseUrl).toBeDefined();
    expect(body.session.idleTimeoutMinutes.admin).toBe(15);
  });
});

void sessionStore;
void adminServiceClient;
