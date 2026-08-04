import { afterEach, describe, expect, it, vi } from 'vitest';

import { identityClient } from './identity-client';

function mockFetchOnce(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

describe('identityClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login() posts credentials and returns the parsed TokenPair', async () => {
    mockFetchOnce(200, { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 900 });
    const result = await identityClient.login({ email: 'a@b.com', password: 'secret' });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 900 });
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/v1/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'secret' });
  });

  it('login() surfaces a 202 MFA challenge without treating it as an error', async () => {
    mockFetchOnce(202, { challengeId: 'c1', expiresInSeconds: 300 });
    const result = await identityClient.login({ email: 'a@b.com', password: 'secret' });

    expect(result.status).toBe(202);
    expect(result.body).toEqual({ challengeId: 'c1', expiresInSeconds: 300 });
  });

  it('verifyMfa() posts the challengeId/totpCode and returns the parsed TokenPair', async () => {
    mockFetchOnce(200, { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 900 });
    const result = await identityClient.verifyMfa({ challengeId: 'c1', totpCode: '123456' });

    expect(result.status).toBe(200);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/v1/auth/mfa/verify');
    expect(JSON.parse(init.body)).toEqual({ challengeId: 'c1', totpCode: '123456' });
  });

  it('verifyMfa() passes through an incorrect-code Problem', async () => {
    mockFetchOnce(401, { code: 'invalid_code', message: 'Incorrect code.' });
    const result = await identityClient.verifyMfa({ challengeId: 'c1', totpCode: '000000' });

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ code: 'invalid_code', message: 'Incorrect code.' });
  });

  it('refresh() posts the refreshToken and returns the rotated TokenPair', async () => {
    mockFetchOnce(200, { accessToken: 'new-a', refreshToken: 'new-r', tokenType: 'Bearer', expiresIn: 900 });
    const result = await identityClient.refresh({ refreshToken: 'old-r' });

    expect(result.status).toBe(200);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/v1/auth/refresh');
    expect(JSON.parse(init.body)).toEqual({ refreshToken: 'old-r' });
  });

  it('refresh() passes through a revoked-session Problem', async () => {
    mockFetchOnce(401, { code: 'refresh_reuse_detected', message: 'Session revoked.' });
    const result = await identityClient.refresh({ refreshToken: 'reused-r' });

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ code: 'refresh_reuse_detected', message: 'Session revoked.' });
  });

  it('logout() attaches the bearer token and an optional refreshToken', async () => {
    mockFetchOnce(204, undefined);
    await identityClient.logout('access-token-value', 'refresh-token-value');

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer access-token-value');
    expect(JSON.parse(init.body)).toEqual({ refreshToken: 'refresh-token-value' });
  });

  it('enterpriseFederationStartUrl() builds the SP-initiated redirect URL for the given idpAlias', () => {
    expect(identityClient.enterpriseFederationStartUrl('okta')).toContain('/v1/auth/sso/enterprise/okta/login');
  });

  it('enterpriseOidcCallback() relays code/state as query params to the OIDC callback endpoint', async () => {
    mockFetchOnce(200, { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 900 });
    await identityClient.enterpriseOidcCallback('okta', { code: 'abc', state: 'xyz' });

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/v1/auth/sso/enterprise/okta/oidc/callback?code=abc&state=xyz');
  });

  it('enterpriseSamlAcs() relays the SAML assertion as application/x-www-form-urlencoded', async () => {
    mockFetchOnce(200, { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer', expiresIn: 900 });
    await identityClient.enterpriseSamlAcs('okta', { SAMLResponse: 'encoded-assertion', RelayState: 'state-1' });

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/v1/auth/sso/enterprise/okta/saml/acs');
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(init.body).toContain('SAMLResponse=encoded-assertion');
  });
});
