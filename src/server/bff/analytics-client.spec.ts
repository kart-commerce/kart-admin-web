import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

describe('fetchAnalytics', () => {
  beforeEach(() => {
    // `cachedToken` is module-level state (analytics-client.ts) — reset the
    // module registry per test so each test starts from an uncached slate.
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('logs and rethrows when the service-token request is unreachable', async () => {
    const { logger } = await import('../logger');
    const cause = new Error('ECONNREFUSED');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cause));

    const { fetchAnalytics } = await import('./analytics-client');
    await expect(fetchAnalytics('/internal/v1/dashboards/revenue', {})).rejects.toBe(cause);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: cause }),
      expect.stringContaining('unreachable'),
    );
  });

  it('logs and rethrows when the analytics endpoint itself is unreachable', async () => {
    const { logger } = await import('../logger');
    const cause = new Error('ECONNREFUSED');
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ accessToken: 'svc-token', expiresIn: 3600 }) })
      .mockRejectedValueOnce(cause);
    vi.stubGlobal('fetch', fetchSpy);

    const { fetchAnalytics } = await import('./analytics-client');
    await expect(fetchAnalytics('/internal/v1/dashboards/revenue', {})).rejects.toBe(cause);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: cause }),
      expect.stringContaining('unreachable'),
    );
  });

  it('obtains a client-credentials token before calling the analytics endpoint', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ accessToken: 'svc-token', expiresIn: 3600 }) })
      .mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({ generatedAt: 'now', isProvisional: false }) });
    vi.stubGlobal('fetch', fetchSpy);

    const { fetchAnalytics } = await import('./analytics-client');
    const result = await fetchAnalytics('/internal/v1/dashboards/revenue', { from: '2026-01-01', to: undefined });

    expect(result.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const [tokenUrl, tokenInit] = fetchSpy.mock.calls[0];
    expect(tokenUrl).toContain('/v1/auth/token');
    expect(tokenInit.body).toContain('grant_type=client_credentials');

    const [analyticsUrl, analyticsInit] = fetchSpy.mock.calls[1];
    expect(analyticsUrl).toContain('/internal/v1/dashboards/revenue?from=2026-01-01');
    expect(analyticsInit.headers.Authorization).toBe('Bearer svc-token');
  });

  it('reuses a cached token across calls instead of re-authenticating every time', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ accessToken: 'svc-token', expiresIn: 3600 }) })
      .mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchSpy);

    const { fetchAnalytics } = await import('./analytics-client');
    await fetchAnalytics('/internal/v1/dashboards/revenue', {});
    await fetchAnalytics('/internal/v1/dashboards/revenue', {});

    // 1 token fetch + 2 dashboard fetches = 3 calls, not 4.
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('omits undefined query values rather than sending literal "undefined"', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ accessToken: 'svc-token', expiresIn: 3600 }) })
      .mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchSpy);

    const { fetchAnalytics } = await import('./analytics-client');
    await fetchAnalytics('/internal/v1/dashboards/revenue', { from: '2026-01-01', sku: undefined });

    const [analyticsUrl] = fetchSpy.mock.calls[1];
    expect(analyticsUrl).not.toContain('sku=');
  });
});
