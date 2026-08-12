/**
 * kart-inventory-service API — models (contracts/kart-inventory-service.api-contract.yaml).
 * This app consumes `GET /inventory/{sku}` (CAT-4's SKU lookup, before a
 * manual replenish — writes go through kart-admin-service's
 * `/admin/inventory/{sku}/replenish` proxy instead) and, for Order
 * Management (Admin) flow #7's read-only "Assign Warehouse" view,
 * `GET /inventory/orders/{orderId}/allocations`.
 */
export interface StockLevel {
  sku: string;
  warehouseId?: string | null;
  availableQty: number;
}

export interface WarehouseAllocation {
  warehouseId: string;
  qty: number;
}

/** One row per reservation this order's line items created — usually one warehouse per reservation, more than one only on the multi-warehouse fallback. */
export interface OrderReservation {
  reservationId: string;
  orderId: string;
  sku: string;
  qty: number;
  status: 'reserved' | 'released' | 'expired';
  allocations: WarehouseAllocation[];
  expiresAt: string;
}
