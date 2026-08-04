import { parseCookie, stringifySetCookie } from 'cookie';

/**
 * `kart_admin_session` — an opaque session-store key, never a token
 * (security.md §1/§2.1: HttpOnly/Secure/SameSite=Strict, browser never
 * holds an access/refresh token directly). Cookie max-age tracks the
 * role-specific absolute cap (24h Admin / 8h Support Agent, security.md
 * §2.2) — set per-session in routes.ts, not a single fixed value here.
 */
export const SESSION_COOKIE_NAME = 'kart_admin_session';

function isSecureEnvironment(): boolean {
  // Secure cookies require HTTPS; gated off only so local http:// dev works.
  // Behind the platform's real deployment topology (TLS-terminating
  // ingress), this must always evaluate true.
  return process.env['NODE_ENV'] === 'production';
}

export function serializeSessionCookie(sessionId: string, maxAgeSeconds: number): string {
  return stringifySetCookie({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: isSecureEnvironment(),
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export function serializeClearedSessionCookie(): string {
  return stringifySetCookie({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isSecureEnvironment(),
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export function readSessionId(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  return parseCookie(cookieHeader)[SESSION_COOKIE_NAME];
}
