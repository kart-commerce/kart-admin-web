/**
 * kart-inventory-service API — models (contracts/kart-inventory-service.api-contract.yaml).
 * This app only consumes `GET /inventory/{sku}` (CAT-4's SKU lookup, before
 * a manual replenish) — writes go through kart-admin-service's
 * `/admin/inventory/{sku}/replenish` proxy instead.
 */
export interface StockLevel {
  sku: string;
  warehouseId?: string | null;
  availableQty: number;
}
