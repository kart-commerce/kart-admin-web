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
const ADMIN_SERVICE_BASE_URL = process.env['ADMIN_SERVICE_BASE_URL'] ?? 'http://localhost:5290';

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

export const adminServiceClient = {
  async listOwnGrantCategories(accessToken: string, principalId: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${ADMIN_SERVICE_BASE_URL}/v1/admin/permission-grants?principalId=${encodeURIComponent(principalId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) {
        return [];
      }
      const body = (await response.json()) as { items?: PermissionGrant[] };
      return (body.items ?? []).filter((grant) => !grant.revokedAt).map((grant) => grant.category);
    } catch {
      // kart-admin-service isn't implemented yet (see this app's completion
      // summary) — degrade to "no known grants" rather than fail login.
      return [];
    }
  },
};
