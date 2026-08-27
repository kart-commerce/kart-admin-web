import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GATEWAY_BASE_PATH } from '../../../../base-path';
import {
  AdminActionResult,
  AdminOrderStatusTarget,
  AttributeUpdateRequest,
  AttributeWriteRequest,
  CategoryWriteRequest,
  CouponAdminView,
  CouponWriteRequest,
  FulfillmentExceptionAction,
  GrantCategory,
  IssuePermissionGrantRequest,
  LockUserRequest,
  Page,
  PermissionGrant,
  PrivacyRequest,
  PrivacyRequestStatus,
  ProductWriteRequest,
  ProvisionWarehouseStockRequest,
  ReconcileStockRequest,
  ReplenishInventoryRequest,
  ShippingAddressWriteRequest,
  UpdateReplenishmentThresholdRequest,
} from '../model/models';

/**
 * Typed client for kart-admin-service's api-contract.yaml (21 paths, Order
 * Management (Admin) flow #7 added the five order ones). Every mutating
 * call requires `Idempotency-Key` per that contract's own header note
 * ("back-office actions are the platform's highest-privilege
 * operations... every mutating /admin/* action" requires it, including
 * grant issue/revoke). Callers pass one explicitly (`crypto.randomUUID()`)
 * rather than this service inventing one, so a caller can retry the exact
 * same key on a transient `503`.
 */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(GATEWAY_BASE_PATH);

  // --- permission-management -------------------------------------------------

  listPermissionGrants(params: {
    principalId?: string;
    category?: GrantCategory;
    includeRevoked?: boolean;
    page?: number;
    pageSize?: number;
  } = {}): Observable<Page<PermissionGrant>> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<Page<PermissionGrant>>(`${this.basePath}/admin/permission-grants`, { params: httpParams });
  }

  issuePermissionGrant(request: IssuePermissionGrantRequest, idempotencyKey: string): Observable<PermissionGrant> {
    return this.http.post<PermissionGrant>(`${this.basePath}/admin/permission-grants`, request, {
      headers: this.idempotencyHeaders(idempotencyKey),
    });
  }

  revokePermissionGrant(grantId: string, currentVersion: number, idempotencyKey: string): Observable<PermissionGrant> {
    return this.http.post<PermissionGrant>(
      `${this.basePath}/admin/permission-grants/${encodeURIComponent(grantId)}/revoke`,
      {},
      { headers: this.idempotencyHeaders(idempotencyKey).set('If-Match', String(currentVersion)) },
    );
  }

  // --- catalog-management: products ------------------------------------------

  createProduct(request: ProductWriteRequest, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(`${this.basePath}/admin/products`, request, {
      headers: this.idempotencyHeaders(idempotencyKey),
    });
  }

  updateProduct(
    productId: string,
    request: ProductWriteRequest,
    ifMatchVersion: string,
    idempotencyKey: string,
  ): Observable<AdminActionResult> {
    return this.http.put<AdminActionResult>(`${this.basePath}/admin/products/${encodeURIComponent(productId)}`, request, {
      headers: this.idempotencyHeaders(idempotencyKey).set('If-Match', ifMatchVersion),
    });
  }

  deactivateProduct(productId: string, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.basePath}/admin/products/${encodeURIComponent(productId)}/deactivate`,
      {},
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  // --- catalog-management: categories -----------------------------------------

  createCategory(request: CategoryWriteRequest, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(`${this.basePath}/admin/categories`, request, {
      headers: this.idempotencyHeaders(idempotencyKey),
    });
  }

  updateCategory(
    categoryId: string,
    request: CategoryWriteRequest,
    ifMatchVersion: string,
    idempotencyKey: string,
  ): Observable<AdminActionResult> {
    return this.http.put<AdminActionResult>(`${this.basePath}/admin/categories/${encodeURIComponent(categoryId)}`, request, {
      headers: this.idempotencyHeaders(idempotencyKey).set('If-Match', ifMatchVersion),
    });
  }

  reorderCategory(categoryId: string, displayOrder: number, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.basePath}/admin/categories/${encodeURIComponent(categoryId)}/reorder`,
      { displayOrder },
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  moveCategory(categoryId: string, newParentId: string | null, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.basePath}/admin/categories/${encodeURIComponent(categoryId)}/move`,
      { newParentId },
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  // --- catalog-management: attributes -----------------------------------------

  createAttribute(request: AttributeWriteRequest, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(`${this.basePath}/admin/attributes`, request, {
      headers: this.idempotencyHeaders(idempotencyKey),
    });
  }

  updateAttribute(attributeId: string, request: AttributeUpdateRequest, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.put<AdminActionResult>(`${this.basePath}/admin/attributes/${encodeURIComponent(attributeId)}`, request, {
      headers: this.idempotencyHeaders(idempotencyKey),
    });
  }

  deprecateAttribute(attributeId: string, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.delete<AdminActionResult>(`${this.basePath}/admin/attributes/${encodeURIComponent(attributeId)}`, {
      headers: this.idempotencyHeaders(idempotencyKey),
    });
  }

  // --- coupon-issuance ---------------------------------------------------------

  createCoupon(request: CouponWriteRequest, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(`${this.basePath}/admin/coupons`, request, {
      headers: this.idempotencyHeaders(idempotencyKey),
    });
  }

  deactivateCoupon(couponCode: string, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.basePath}/admin/coupons/${encodeURIComponent(couponCode)}/deactivate`,
      {},
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  /** ASSUMED EXTENSION — see `CouponAdminView`'s doc comment in model/models.ts. */
  listCoupons(params: { page?: number; pageSize?: number } = {}): Observable<Page<CouponAdminView>> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<Page<CouponAdminView>>(`${this.basePath}/admin/coupons`, { params: httpParams });
  }

  // --- user-suspension ----------------------------------------------------------

  lockUser(userId: string, request: LockUserRequest, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(`${this.basePath}/admin/users/${encodeURIComponent(userId)}/lock`, request, {
      headers: this.idempotencyHeaders(idempotencyKey),
    });
  }

  unlockUser(userId: string, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.basePath}/admin/users/${encodeURIComponent(userId)}/unlock`,
      {},
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  // --- inventory-replenishment ----------------------------------------------------

  replenishInventory(sku: string, request: ReplenishInventoryRequest, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.basePath}/admin/inventory/${encodeURIComponent(sku)}/replenish`,
      request,
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  /** Inventory & Stock Management flow: onboards a brand-new (warehouseId, sku) row. */
  provisionWarehouseStock(request: ProvisionWarehouseStockRequest, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(`${this.basePath}/admin/inventory/provision`, request, {
      headers: this.idempotencyHeaders(idempotencyKey),
    });
  }

  /** Inventory & Stock Management flow's "Low Stock Threshold" stage. */
  updateReplenishmentThreshold(
    warehouseId: string,
    sku: string,
    request: UpdateReplenishmentThresholdRequest,
    idempotencyKey: string,
  ): Observable<AdminActionResult> {
    return this.http.patch<AdminActionResult>(
      `${this.basePath}/admin/inventory/${encodeURIComponent(warehouseId)}/${encodeURIComponent(sku)}/threshold`,
      request,
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  /** Inventory & Stock Management flow's "Stock Audit/Reconciliation" and "Update Qty" stages. */
  reconcileStock(warehouseId: string, sku: string, request: ReconcileStockRequest, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.basePath}/admin/inventory/${encodeURIComponent(warehouseId)}/${encodeURIComponent(sku)}/reconcile`,
      request,
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  // --- order-management (Order Management (Admin) flow #7) -------------------------

  cancelOrder(orderId: string, reason: string | null, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.basePath}/admin/orders/${encodeURIComponent(orderId)}/cancel`,
      reason === null ? {} : { reason },
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  updateOrderStatus(
    orderId: string,
    targetStatus: AdminOrderStatusTarget,
    reason: string,
    idempotencyKey: string,
  ): Observable<AdminActionResult> {
    return this.http.patch<AdminActionResult>(
      `${this.basePath}/admin/orders/${encodeURIComponent(orderId)}/status`,
      { targetStatus, reason },
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  updateOrderShippingAddress(orderId: string, request: ShippingAddressWriteRequest, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.patch<AdminActionResult>(
      `${this.basePath}/admin/orders/${encodeURIComponent(orderId)}/shipping-address`,
      request,
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  requestOrderShipment(orderId: string, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.basePath}/admin/orders/${encodeURIComponent(orderId)}/request-shipment`,
      null,
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  resolveOrderFulfillmentException(orderId: string, action: FulfillmentExceptionAction, idempotencyKey: string): Observable<AdminActionResult> {
    return this.http.post<AdminActionResult>(
      `${this.basePath}/admin/orders/${encodeURIComponent(orderId)}/resolve-fulfillment-exception`,
      { action },
      { headers: this.idempotencyHeaders(idempotencyKey) },
    );
  }

  // --- audit (read-only, role gate only — no category grant check) ------------------

  listAdminActions(params: {
    adminId?: string;
    category?: GrantCategory;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  } = {}): Observable<Page<AdminActionResult>> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<Page<AdminActionResult>>(`${this.basePath}/admin/actions`, { params: httpParams });
  }

  // --- compliance (AUD-3, ASSUMED EXTENSION — see PrivacyRequest's doc comment) ----

  listPrivacyRequests(params: { status?: PrivacyRequestStatus; page?: number; pageSize?: number } = {}): Observable<Page<PrivacyRequest>> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<Page<PrivacyRequest>>(`${this.basePath}/admin/privacy-requests`, { params: httpParams });
  }

  private idempotencyHeaders(idempotencyKey: string): HttpHeaders {
    return new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
  }
}
