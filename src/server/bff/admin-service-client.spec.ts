import { afterEach, describe, expect, it, vi } from 'vitest';

import { adminServiceClient } from './admin-service-client';

describe('adminServiceClient.listOwnGrantCategories', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('degrades to an empty array on a non-OK response (e.g. the literal 403 reading of the contract)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect(await adminServiceClient.listOwnGrantCategories('token', 'p1')).toEqual([]);
  });

  it('degrades to an empty array when the service is unreachable, rather than throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    expect(await adminServiceClient.listOwnGrantCategories('token', 'p1')).toEqual([]);
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
