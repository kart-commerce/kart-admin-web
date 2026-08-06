import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { logger } from '../logger';
import { adminServiceClient } from './admin-service-client';

describe('adminServiceClient.listOwnGrantCategories', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('returns only the live (non-revoked) grant categories', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              { grantId: 'g1', principalId: 'p1', category: 'catalog-management', revokedAt: null },
              { grantId: 'g2', principalId: 'p1', category: 'user-suspension', revokedAt: '2026-01-01T00:00:00Z' },
            ],
          }),
      }),
    );

    const categories = await adminServiceClient.listOwnGrantCategories('token', 'p1');
    expect(categories).toEqual(['catalog-management']);
  });

  it('degrades to an empty array on the documented 403 self-lookup case, logged as a warning (not an error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' }));

    expect(await adminServiceClient.listOwnGrantCategories('token', 'p1')).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ principalId: 'p1' }),
      expect.stringContaining('403'),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('degrades to an empty array on an unexpected non-OK response, logged as an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' }));

    expect(await adminServiceClient.listOwnGrantCategories('token', 'p1')).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ principalId: 'p1', status: 503 }),
      expect.stringContaining('non-OK response'),
    );
  });

  it('degrades to an empty array when the service is unreachable, rather than throwing, and logs the cause loudly', async () => {
    const cause = new Error('ECONNREFUSED');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cause));

    expect(await adminServiceClient.listOwnGrantCategories('token', 'p1')).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ principalId: 'p1', err: cause }),
      expect.stringContaining('unreachable'),
    );
  });

  it('scopes the request to the given principalId', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) });
    vi.stubGlobal('fetch', fetchSpy);

    await adminServiceClient.listOwnGrantCategories('token-value', 'principal-42');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('principalId=principal-42');
    expect(init.headers.Authorization).toBe('Bearer token-value');
  });
});
