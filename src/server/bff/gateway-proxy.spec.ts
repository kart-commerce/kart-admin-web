import express from 'express';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { SESSION_COOKIE_NAME } from './cookie';

vi.mock('../logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

vi.mock('./session-store', async () => {
  const actual = await vi.importActual<typeof import('./session-store')>('./session-store');
  const sessions = new Map<string, unknown>([
    ['session-1', { accessToken: 'access-token-1', refreshToken: 'r', role: 'admin', principalId: 'p1' }],
  ]);
  return {
    ...actual,
    sessionStore: {
      get: vi.fn(async (sessionId: string) => sessions.get(sessionId) ?? null),
    },
  };
});

/**
 * `gateway-proxy.ts` calls the *global* `fetch` directly (no wrapping
 * client module to mock, unlike `admin-service-client.ts`), so the outer
 * request to this test's own local Express server has to go over real
 * `node:http` instead of `fetch` — stubbing global `fetch` would otherwise
 * also intercept the outer call before it ever reaches the server.
 */
function request(
  baseUrl: string,
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${baseUrl}${path}`,
      { method: options.method ?? 'GET', headers: options.headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }),
        );
      },
    );
    req.on('error', reject);
    if (options.body !== undefined) {
      req.write(options.body);
    }
    req.end();
  });
}

describe('gatewayProxyRouter', () => {
  let baseUrl: string;
  let server: ReturnType<express.Express['listen']>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const { gatewayProxyRouter } = await import('./gateway-proxy');
    const app = express();
    app.use(express.json());
    app.use('/api/bff/gateway', gatewayProxyRouter);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}/api/bff/gateway`;
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function stubUpstream(response: { status?: number; headers?: Headers; text?: () => Promise<string> }) {
    fetchSpy = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve('{}'),
      ...response,
    });
    vi.stubGlobal('fetch', fetchSpy);
    return fetchSpy;
  }

  it('attaches Authorization: Bearer <session token> when a valid session cookie is present', async () => {
    stubUpstream({});

    await request(baseUrl, '/v1/admin/products', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-1`, 'content-type': 'application/json' },
      body: '{"name":"widget"}',
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.get('Authorization')).toBe('Bearer access-token-1');
  });

  it('forwards to the gateway with the /api/bff/gateway prefix stripped', async () => {
    stubUpstream({});

    await request(baseUrl, '/v1/admin/products', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-1` },
      body: '{}',
    });

    const [url] = fetchSpy.mock.calls[0];
    expect(url.endsWith('/v1/admin/products')).toBe(true);
    expect(url).not.toContain('/api/bff/gateway');
  });

  it('sends no Authorization header when there is no session (gateway 401s on its own)', async () => {
    stubUpstream({});

    await request(baseUrl, '/v1/admin/products', { method: 'POST', body: '{}' });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.has('Authorization')).toBe(false);
  });

  it('forwards Idempotency-Key and If-Match through to the gateway', async () => {
    stubUpstream({});

    await request(baseUrl, '/v1/admin/products', {
      method: 'POST',
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-1`,
        'idempotency-key': 'idem-1',
        'if-match': '"3"',
      },
      body: '{}',
    });

    const [, init] = fetchSpy.mock.calls[0];
    expect(init.headers.get('idempotency-key')).toBe('idem-1');
    expect(init.headers.get('if-match')).toBe('"3"');
  });

  it('relays the upstream status code and body back to the caller', async () => {
    stubUpstream({ status: 403, text: () => Promise.resolve('{"code":"forbidden"}') });

    const res = await request(baseUrl, '/v1/admin/products', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-1` },
      body: '{}',
    });

    expect(res.status).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ code: 'forbidden' });
  });

  it('ends the response with no body on a 204', async () => {
    stubUpstream({ status: 204 });

    const res = await request(baseUrl, '/v1/admin/products/abc/deactivate', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-1` },
      body: '{}',
    });

    expect(res.status).toBe(204);
  });

  it('returns a 502 Problem response when the gateway is unreachable, never a raw stack trace', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const res = await request(baseUrl, '/v1/admin/products', {
      method: 'POST',
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-1` },
      body: '{}',
    });

    expect(res.status).toBe(502);
    expect(JSON.parse(res.body)).toEqual({
      code: 'upstream_unavailable',
      message: 'A dependent service is unavailable.',
    });
  });
});
