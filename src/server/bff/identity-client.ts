/**
 * Server-only client for kart-identity-service's approved api-contract.yaml
 * (server base path `/v1`). Never imported into browser-executed code — the
 * BFF is the only thing that ever holds a token or an identity-service URL.
 *
 * Base URL defaults to the service's own documented local dev port so this
 * works out of the box against a locally-running kart-identity-service;
 * override via IDENTITY_SERVICE_BASE_URL when routing through
 * kart-api-gateway or a deployed environment instead.
 */
import { logger } from '../logger';

const IDENTITY_SERVICE_BASE_URL = process.env['IDENTITY_SERVICE_BASE_URL'] ?? 'http://localhost:5200';

/**
 * The enterprise IdP alias configured for this deployment
 * (kart-identity-service api-contract.yaml's `{idpAlias}` path segment —
 * "Okta/Azure AD/Google Workspace are the BRD's named examples"). This app
 * only ever federates Admin logins against one configured enterprise IdP,
 * so a single alias (not a picker UI) is sufficient per requirement-spec.md
 * §5 — override via ENTERPRISE_IDP_ALIAS to match the deployment's actual
 * configured alias.
 */
export const ENTERPRISE_IDP_ALIAS = process.env['ENTERPRISE_IDP_ALIAS'] ?? 'okta';

export type Role = 'customer' | 'support_agent' | 'admin' | 'partner_api';

export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly roles?: readonly Role[];
  readonly scopes?: readonly string[];
}

export interface MfaChallenge {
  readonly challengeId: string;
  readonly expiresInSeconds: number;
}

export interface Problem {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface IdentityResponse<T> {
  readonly status: number;
  readonly body: T;
}

async function identityFetch<T>(path: string, init: RequestInit = {}): Promise<IdentityResponse<T>> {
  const url = `${IDENTITY_SERVICE_BASE_URL}/v1${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch (error) {
    // Logged with full detail (stack trace included) before rethrowing — control flow is
    // unchanged, this still bubbles to server.ts's global BFF error middleware and becomes a
    // generic 502, but that boundary's own log line loses the "which call, which URL" context
    // this one has. kart-conventions.md's "one log per exception" is satisfied by that
    // boundary; this is deliberately an *additional*, more specific log, not a replacement.
    logger.error({ err: error, url, method: init.method ?? 'GET' }, 'identityClient: request threw — is kart-identity-service unreachable?');
    throw error;
  }
  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body };
}

export const identityClient = {
  login(request: { email: string; password: string }) {
    return identityFetch<TokenPair | MfaChallenge | Problem>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  verifyMfa(request: { challengeId: string; totpCode: string }) {
    return identityFetch<TokenPair | Problem>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  refresh(request: { refreshToken: string }) {
    return identityFetch<TokenPair | Problem>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  logout(accessToken: string, refreshToken?: string) {
    return identityFetch<Problem | undefined>('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
  },

  /**
   * Browser-reachable redirect target for AUTH-1's SP-initiated federation
   * start (`GET /auth/sso/enterprise/{idpAlias}/login`, a 302 straight to
   * the IdP — this BFF route only needs to build the URL, not call it
   * server-side).
   */
  enterpriseFederationStartUrl(idpAlias: string): string {
    return `${IDENTITY_SERVICE_BASE_URL}/v1/auth/sso/enterprise/${encodeURIComponent(idpAlias)}/login`;
  },

  /**
   * Server-to-server leg of the OIDC enterprise callback. Assumption
   * (flagged for confirmation with the kart-identity-service team, same
   * class of assumption kart-web's own identity-client.ts already flags for
   * customer social login): the OIDC `redirect_uri` registered with the
   * enterprise IdP is this app's own BFF callback route
   * (`/api/bff/auth/sso/enterprise/callback`), not identity-service's
   * directly — the IdP therefore redirects the browser to this BFF first,
   * and this call relays the resulting `code`/`state` to identity-service
   * server-to-server so it can complete the token exchange using its own
   * IdP client credentials. Identity-service still terminates federation
   * entirely (security.md §"Admin -. federates via .-> EnterpriseIdP") —
   * this BFF never talks to the IdP directly.
   */
  enterpriseOidcCallback(idpAlias: string, query: { code: string; state: string }) {
    const params = new URLSearchParams(query);
    return identityFetch<TokenPair | Problem>(
      `/auth/sso/enterprise/${encodeURIComponent(idpAlias)}/oidc/callback?${params.toString()}`,
      { method: 'GET' },
    );
  },

  /**
   * Server-to-server relay of a SAML 2.0 Assertion Consumer Service POST.
   * Same registered-endpoint assumption as the OIDC callback above, adapted
   * for SAML's browser-form-POST binding: the SAML IdP's relying-party ACS
   * URL is configured as this app's own BFF route
   * (`/api/bff/auth/sso/enterprise/saml/acs`), which receives the browser's
   * raw form POST and relays the assertion to identity-service's real ACS
   * endpoint using the same `application/x-www-form-urlencoded` shape its
   * contract expects.
   */
  enterpriseSamlAcs(idpAlias: string, form: { SAMLResponse: string; RelayState?: string }) {
    const body = new URLSearchParams(form);
    return identityFetch<TokenPair | Problem>(`/auth/sso/enterprise/${encodeURIComponent(idpAlias)}/saml/acs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  },
};
