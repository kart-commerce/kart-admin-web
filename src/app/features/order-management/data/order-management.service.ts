import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AdminApiService } from '../../../core/http/generated/admin/v1';
import type { AdminOrderStatusTarget, ShippingAddressWriteRequest } from '../../../core/http/generated/admin/v1';
import { OrderApiService } from '../../../core/http/generated/order/v1';
import type { Invoice, OrderSearchFilter, OrderView, PagedOrders } from '../../../core/http/generated/order/v1';
import { InventoryReadApiService } from '../../../core/http/generated/inventory/v1';
import type { OrderReservation } from '../../../core/http/generated/inventory/v1';

/**
 * Order Management (Admin) flow #7's data layer. Reads (list/detail/invoice/warehouse
 * allocations) go straight to kart-order-service/kart-inventory-service (both AdminOnly-gated on
 * the owning service itself, reached via this app's own Admin-role session) — same read/write
 * split Category/Product already use, a read produces no `admin_actions` audit row. Every write
 * goes through kart-admin-service's `/admin/orders/*` proxy instead, for that audit trail.
 */
@Injectable({ providedIn: 'root' })
export class OrderManagementService {
  private readonly orderApi = inject(OrderApiService);
  private readonly adminApi = inject(AdminApiService);
  private readonly inventoryReadApi = inject(InventoryReadApiService);

  listOrders(filter: OrderSearchFilter = {}): Observable<PagedOrders> {
    return this.orderApi.listOrders(filter);
  }

  getOrder(orderId: string): Observable<OrderView> {
    return this.orderApi.getOrder(orderId);
  }

  getInvoice(orderId: string): Observable<Invoice> {
    return this.orderApi.getInvoice(orderId);
  }

  /** "Assign Warehouse" view — read-only, warehouse allocation itself stays fully automatic. */
  getWarehouseAllocations(orderId: string): Observable<OrderReservation[]> {
    return this.inventoryReadApi.getOrderAllocations(orderId);
  }

  cancelOrder(orderId: string, reason: string | null): Observable<void> {
    return this.adminApi.cancelOrder(orderId, reason, crypto.randomUUID()).pipe(map(() => undefined));
  }

  updateStatus(orderId: string, targetStatus: AdminOrderStatusTarget, reason: string): Observable<void> {
    return this.adminApi.updateOrderStatus(orderId, targetStatus, reason, crypto.randomUUID()).pipe(map(() => undefined));
  }

  updateShippingAddress(orderId: string, address: ShippingAddressWriteRequest): Observable<void> {
    return this.adminApi.updateOrderShippingAddress(orderId, address, crypto.randomUUID()).pipe(map(() => undefined));
  }

  requestShipment(orderId: string): Observable<void> {
    return this.adminApi.requestOrderShipment(orderId, crypto.randomUUID()).pipe(map(() => undefined));
  }
}
