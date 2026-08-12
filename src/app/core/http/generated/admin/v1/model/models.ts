/**
 * kart-admin-service API — models (docs/services/kart-admin-service/api-contract.yaml).
 * See core/http/generated/README.md for this folder's provenance note.
 */

export type GrantCategory =
  | 'catalog-management'
  | 'coupon-issuance'
  | 'user-suspension'
  | 'inventory-replenishment'
  | 'permission-management'
  | 'compliance'
  | 'order-management';

/**
 * Runtime companion to the `GrantCategory` type, regenerated in lockstep
 * with it whenever this file is regenerated from the real contract —
 * IDN-2's category dropdown reads its options from this array (never a
 * second, hand-maintained list), so XTEAM-1 landing the `compliance` value
 * upstream flows through automatically once this file is regenerated,
 * per tickets.md's explicit instruction ("sourced dynamically... not
 * hand-enumerated"). `compliance` is included here ahead of XTEAM-1
 * actually merging upstream — see AUD-3's own doc comments.
 */
export const GRANT_CATEGORIES: readonly GrantCategory[] = [
  'catalog-management',
  'coupon-issuance',
  'user-suspension',
  'inventory-replenishment',
  'permission-management',
  'compliance',
  'order-management',
];

export interface Money {
  amount: number;
  currency: string;
}

/** Order Management (Admin) flow #7 — mirrors kart-order-service's own ShippingAddress request shape exactly. */
export interface ShippingAddressWriteRequest {
  recipientName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
}

export type AdminOrderStatusTarget = 'Shipped' | 'Delivered' | 'FulfillmentException';

export type FulfillmentExceptionAction = 'retry' | 'cancel';

export interface Problem {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PermissionGrant {
  grantId: string;
  principalId: string;
  category: GrantCategory;
  grantedAt: string;
  grantedBy: string;
  revokedAt?: string | null;
  revokedBy?: string | null;
  version: number;
}

export interface IssuePermissionGrantRequest {
  principalId: string;
  category: GrantCategory;
}

export interface AdminActionResult {
  actionId: string;
  adminId: string;
  category: GrantCategory;
  action: string;
  entityId: string;
  context?: Record<string, unknown> | null;
  performedAt: string;
  publishedAt?: string | null;
}

export interface ProductWriteRequest {
  name: string;
  description?: string;
  categoryId: string;
  price: Money;
  sku?: string;
}

export interface CategoryWriteRequest {
  name: string;
  parentId?: string | null;
  displayOrder?: number;
}

/** Added for the "Category & Attribute Management (Admin)" flow - mirrors Category Service's own POST /v1/attributes. categoryId null creates a global attribute. */
export interface AttributeValueWriteRequest {
  value: string;
  displayOrder: number;
}

export interface AttributeWriteRequest {
  name: string;
  categoryId?: string | null;
  dataType: string;
  values?: AttributeValueWriteRequest[];
}

/** categoryId/dataType are immutable after creation, so the update shape omits them entirely. */
export interface AttributeUpdateRequest {
  name: string;
  values?: AttributeValueWriteRequest[];
}

export interface CouponWriteRequest {
  couponCode: string;
  discountValue: Money;
  perUserCap?: number | null;
  globalCap?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
}

export interface ReplenishInventoryRequest {
  warehouseId: string;
  qtyAdded: number;
  reason?: string;
}

/** Inventory & Stock Management flow: onboards a brand-new (warehouseId, sku) row. */
export interface ProvisionWarehouseStockRequest {
  warehouseId: string;
  sku: string;
  initialQty: number;
  replenishmentThreshold: number;
  targetStockingLevel: number;
}

/** Inventory & Stock Management flow's "Low Stock Threshold" stage. */
export interface UpdateReplenishmentThresholdRequest {
  replenishmentThreshold: number;
  targetStockingLevel: number;
}

/** Inventory & Stock Management flow's "Stock Audit/Reconciliation" and "Update Qty" stages. */
export interface ReconcileStockRequest {
  countedQty: number;
  reason: string;
}

export interface LockUserRequest {
  reason?: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * ASSUMED EXTENSION — not in the real api-contract.yaml. No list-coupons
 * endpoint exists anywhere in this platform's approved contracts (checked
 * both kart-admin-service's and kart-offer-service's own contracts) —
 * CAT-3's list screen is unusable without one, the same reasoning the real
 * contract's own header note already used to add `GET
 * /admin/permission-grants` and `GET /admin/actions` beyond
 * requirement-spec.md's original starting surface. Mirrors
 * kart-offer-service's real `CouponAdminView` response shape (`GET
 * /v1/coupons/{couponCode}`) rather than inventing a new one, since that's
 * the eventual real per-item shape this list would return.
 */
export interface CouponAdminView {
  couponCode: string;
  perUserCap?: number | null;
  globalCap?: number | null;
  validFrom: string;
  validUntil: string;
  totalRedemptions: number;
  version: number;
}

/**
 * ASSUMED EXTENSION — not in the real api-contract.yaml. AUD-3 (Privacy
 * Requests) needs a way to list GDPR rights-requests (erasure/export), but
 * no read endpoint for this exists anywhere in this platform's approved
 * contracts — kart-user-service only exposes `POST
 * /internal/v1/users/{userId}/erasure-requests` (submit, no list/read), and
 * privacy.md §B.9 states this view "reuses" the Audit & Compliance screen
 * without itself defining a backing endpoint. Modeled here as a `compliance`
 * -category read on kart-admin-service, consistent with edge-cases.md's own
 * resolution ("gate behind a new compliance category grant... reuses
 * kart-admin-service's existing category-grant mechanism") — the natural
 * owner for a newly-compliance-gated admin read, not a new service.
 */
export type PrivacyRequestType = 'erasure' | 'export';
export type PrivacyRequestStatus = 'pending' | 'completed' | 'rejected';

export interface PrivacyRequest {
  requestId: string;
  principalId: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  requestedAt: string;
  completedAt?: string | null;
}
