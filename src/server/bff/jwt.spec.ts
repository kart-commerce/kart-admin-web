import { describe, expect, it } from 'vitest';

import { decodeJwtPayload, KartAccessTokenClaims } from './jwt';

function toBase64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

describe('decodeJwtPayload', () => {
  it('decodes the payload segment of a well-formed JWT', () => {
    const payload: KartAccessTokenClaims = { sub: 'principal-1', roles: ['admin'] };
    const token = `${toBase64Url('{}')}.${toBase64Url(JSON.stringify(payload))}.signature`;

    expect(decodeJwtPayload<KartAccessTokenClaims>(token)).toEqual(payload);
  });

  it('returns null for a token with the wrong number of segments', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('only.two')).toBeNull();
  });

  it('returns null when the payload segment is not valid JSON', () => {
    const token = `${toBase64Url('{}')}.${toBase64Url('not json')}.signature`;
    expect(decodeJwtPayload(token)).toBeNull();
  });
});
