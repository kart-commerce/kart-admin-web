/**
 * kart-category-service API — models (contracts/kart-category-service.api-contract.yaml).
 * This app only consumes the read path (`GET /categories`) directly — writes
 * go through kart-admin-service's own `/admin/categories/*` proxy instead
 * (CAT-2's design source: "Category owns its own write model and write
 * API; Admin calls it, never writes Category's tables directly" — this
 * app's write screens call Admin's proxy, per requirement-spec.md §3.1, not
 * this client).
 */

export type CategoryStatus = 'active' | 'deprecated';

export interface Category {
  categoryId: string;
  name: string;
  parentId?: string | null;
  ancestorPath?: string[];
  depth: number;
  status: CategoryStatus;
}
