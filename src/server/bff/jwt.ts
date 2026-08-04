/**
 * Decodes (never verifies) a JWT payload — used only to read claims off a
 * token this BFF just received directly from kart-identity-service over a
 * trusted server-to-server channel (never an externally-supplied token), so
 * signature verification here would be redundant with Identity's own
 * issuance guarantee. Never use this on a token from an untrusted source.
 */
export function decodeJwtPayload<T>(token: string): T | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

export interface KartAccessTokenClaims {
  readonly sub: string;
  readonly roles?: readonly string[];
}
