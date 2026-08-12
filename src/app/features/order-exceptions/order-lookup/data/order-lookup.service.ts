import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { FulfillmentExceptionAction, OrderApiService, OrderView } from '../../../../core/http/generated/order/v1';

/**
 * ORD-1's data layer — a thin wrapper over kart-order-service's own read endpoint and, for
 * fulfillment-exception resolution, kart-admin-service's own admin-write proxy.
 *
 * Order Management (Admin) flow #7: `resolveFulfillmentException` used to call
 * kart-order-service's own AdminOnly-gated endpoint directly, bypassing kart-admin-service (and
 * its `admin_actions` audit trail) entirely — the only admin write on this platform that did.
 * Now routed through `/admin/orders/{id}/resolve-fulfillment-exception` like every other admin
 * write, closing that gap. That proxy only returns a generic `AdminActionResult` (no full order
 * body — kart-admin-service never echoes the owning service's resource back, same as every other
 * proxied write), so a follow-up `getOrder` call refreshes the view — this component's own
 * contract (`Observable<OrderView>`) stays unchanged either way.
 */
@Injectable({ providedIn: 'root' })
export class OrderLookupService {
  private readonly orderApi = inject(OrderApiService);
  private readonly adminApi = inject(AdminApiService);

  getOrder(orderId: string): Observable<OrderView> {
    return this.orderApi.getOrder(orderId);
  }

  /** ORD-2 — reached from this order's own detail view once its status is `FulfillmentException`. */
  resolveFulfillmentException(orderId: string, action: FulfillmentExceptionAction): Observable<OrderView> {
    return this.adminApi
      .resolveOrderFulfillmentException(orderId, action, crypto.randomUUID())
      .pipe(switchMap(() => this.orderApi.getOrder(orderId)));
  }
}
