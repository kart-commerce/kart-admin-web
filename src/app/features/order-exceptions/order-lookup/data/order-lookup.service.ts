import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { FulfillmentExceptionAction, OrderApiService, OrderView } from '../../../../core/http/generated/order/v1';

/** ORD-1's data layer — a thin wrapper over kart-order-service's own read/admin-write endpoints. */
@Injectable({ providedIn: 'root' })
export class OrderLookupService {
  private readonly orderApi = inject(OrderApiService);

  getOrder(orderId: string): Observable<OrderView> {
    return this.orderApi.getOrder(orderId);
  }

  /** ORD-2 — reached from this order's own detail view once its status is `FulfillmentException`. */
  resolveFulfillmentException(orderId: string, action: FulfillmentExceptionAction): Observable<OrderView> {
    return this.orderApi.resolveFulfillmentException(orderId, { action }, crypto.randomUUID());
  }
}
