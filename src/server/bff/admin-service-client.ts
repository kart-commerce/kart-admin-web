/**
 * Server-only client for kart-admin-service's approved api-contract.yaml,
 * used only to enrich a freshly-established session with the principal's
 * own live category grants (AUTH-5's render-time snapshot, `SessionInfo.grants`).
 *
 * Flagged assumption: `GET /admin/permission-grants`'s own 403 response
 * description reads "Caller lacks the coarse Admin role claim, **or lacks a
 * live permission-management grant**" — taken literally, a principal who
 * holds e.g. only `catalog-management` could never list even their own
 * grants through this endpoint, which would make AUTH-5's render-time check
 * permanently unusable for anyone but a permission-management holder. This
 * client calls it anyway, filtered to the caller's own `principalId`, on the
 * working assumption that a self-scoped read is intended to be allowed
 * regardless of category grant (the same class of "self-lookup shouldn't
 * need the very permission being looked up" pattern most RBAC systems apply)
 * — to reconcile with the kart-admin-service team once that service is
 * actually implemented. A 403 here is treated as "no grants known" rather
 * than a hard failure, so a real backend enforcing the literal contract
 * degrades to an empty grants array instead of breaking login.
 */
import { logger } from '../logger';

const ADMIN_SERVICE_BASE_URL = process.env['ADMIN_SERVICE_BASE_URL'] ?? 'http://localhost:5290';

if (!process.env['ADMIN_SERVICE_BASE_URL']) {
  // Surfaced at boot, not just buried in a per-request log, so a missing/misconfigured
  // ADMIN_SERVICE_BASE_URL is visible before the first login ever hits this client.
  logger.warn(
    { defaultUrl: ADMIN_SERVICE_BASE_URL },
    'adminServiceClient: ADMIN_SERVICE_BASE_URL is not set — defaulting to localhost. ' +
      'Set it explicitly for any environment where kart-admin-service is actually deployed.',
  );
}

export interface PermissionGrant {
  readonly grantId: string;
  readonly principalId: string;
  readonly category: string;
  readonly grantedAt: string;
  readonly grantedBy: string;
  readonly revokedAt: string | null;
  readonly revokedBy: string | null;
  readonly version: number;
}

/**
 * `degraded: true` means "grants could not actually be checked" (unreachable service, an
 * unexpected non-OK response) as opposed to "checked, and there are none" (the documented
 * 403 self-lookup case) — callers use this to tell an admin their grants view may be
 * incomplete, rather than silently rendering an empty-grants session as if it were normal.
 */
export interface OwnGrantCategoriesResult {
  readonly categories: string[];
  readonly degraded: boolean;
}

export const adminServiceClient = {
  async listOwnGrantCategories(accessToken: string, principalId: string): Promise<OwnGrantCategoriesResult> {
    const url = `${ADMIN_SERVICE_BASE_URL}/v1/admin/permission-grants?principalId=${encodeURIComponent(principalId)}`;
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) {
        if (response.status === 403) {
          // Expected under the literal contract reading (see file header) — a principal
          // without a permission-management grant self-looking-up their own grants.
          // Not a failure, just "no grants known" — logged at warn, not error.
          logger.warn(
            { url, principalId },
            'adminServiceClient: permission-grants lookup returned 403 (treated as no grants known)',
          );
          return { categories: [], degraded: false };
        }
        logger.error(
          { url, principalId, status: response.status, statusText: response.statusText },
          'adminServiceClient: permission-grants lookup failed with a non-OK response',
        );
        return { categories: [], degraded: true };
      }
      const body = (await response.json()) as { items?: PermissionGrant[] };
      const categories = (body.items ?? []).filter((grant) => !grant.revokedAt).map((grant) => grant.category);
      return { categories, degraded: false };
    } catch (error) {
      logger.error(
        { url, principalId, err: error },
        'adminServiceClient: permission-grants lookup threw — is the service unreachable?',
      );
      return { categories: [], degraded: true };
    }
  },
};
