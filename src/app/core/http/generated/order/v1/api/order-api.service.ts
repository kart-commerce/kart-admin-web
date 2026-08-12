import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GATEWAY_BASE_PATH } from '../../../../base-path';
import { Invoice, OrderSearchFilter, OrderView, PagedOrders, ResolveFulfillmentExceptionRequest } from '../model/models';

/**
 * Typed client for kart-order-service's api-contract.yaml — this app only
 * consumes `GET /v1/orders/{id}` (ORD-1, SUP-1) and
 * `POST /v1/orders/{id}/resolve-fulfillment-exception` (ORD-2, internal
 * admin-only per that contract's own `clientCredentials` security scheme —
 * reached here via the gateway under this app's own Admin-role session,
 * mirroring the same "this app's session, not a service-principal token,
 * carries the privilege" pattern every other admin-only call in this app
 * uses).
 */
@Injectable({ providedIn: 'root' })
export class OrderApiService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(GATEWAY_BASE_PATH);

  getOrder(orderId: string): Observable<OrderView> {
    return this.http.get<OrderView>(`${this.basePath}/orders/${encodeURIComponent(orderId)}`);
  }

  /** Order Management (Admin) flow #7 — AdminOnly-gated list/search view. */
  listOrders(filter: OrderSearchFilter = {}): Observable<PagedOrders> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<PagedOrders>(`${this.basePath}/orders`, { params });
  }

  /** Order Management (Admin) flow #7 — AdminOnly-gated invoice view. */
  getInvoice(orderId: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.basePath}/orders/${encodeURIComponent(orderId)}/invoice`);
  }

  resolveFulfillmentException(
    orderId: string,
    request: ResolveFulfillmentExceptionRequest,
    idempotencyKey: string,
  ): Observable<OrderView> {
    return this.http.post<OrderView>(
      `${this.basePath}/orders/${encodeURIComponent(orderId)}/resolve-fulfillment-exception`,
      request,
      { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) },
    );
  }
}
