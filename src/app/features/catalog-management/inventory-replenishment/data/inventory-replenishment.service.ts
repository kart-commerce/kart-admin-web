import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { InventoryReadApiService, StockLevel } from '../../../../core/http/generated/inventory/v1';

export interface ReplenishFormValue {
  warehouseId: string;
  qtyAdded: number;
  reason?: string;
}

export interface ProvisionFormValue {
  warehouseId: string;
  sku: string;
  initialQty: number;
  replenishmentThreshold: number;
  targetStockingLevel: number;
}

export interface ThresholdFormValue {
  replenishmentThreshold: number;
  targetStockingLevel: number;
}

export interface ReconcileFormValue {
  countedQty: number;
  reason: string;
}

/**
 * CAT-4's data layer, extended by the Inventory & Stock Management flow to cover the rest of
 * that flow's Inventory Dashboard (Provision, Low Stock Threshold, Stock Audit/Reconciliation,
 * Reorder Alert). Stock-level/low-stock lookups go straight to kart-inventory-service's own
 * public read paths (informational display); every write goes through kart-admin-service's
 * `/admin/inventory/*` proxies (audited, permission-grant-gated) — the same split CAT-4 already
 * established for replenish.
 */
@Injectable({ providedIn: 'root' })
export class InventoryReplenishmentService {
  private readonly inventoryReadApi = inject(InventoryReadApiService);
  private readonly adminApi = inject(AdminApiService);

  getStockLevel(sku: string, warehouseId?: string): Observable<StockLevel> {
    return this.inventoryReadApi.getStockLevel(sku, warehouseId);
  }

  getLowStock(warehouseId?: string): Observable<StockLevel[]> {
    return this.inventoryReadApi.getLowStock(warehouseId);
  }

  replenish(sku: string, value: ReplenishFormValue): Observable<void> {
    return this.adminApi
      .replenishInventory(sku, { warehouseId: value.warehouseId, qtyAdded: value.qtyAdded, reason: value.reason }, crypto.randomUUID())
      .pipe(map(() => undefined));
  }

  provision(value: ProvisionFormValue): Observable<void> {
    return this.adminApi.provisionWarehouseStock(value, crypto.randomUUID()).pipe(map(() => undefined));
  }

  updateThreshold(warehouseId: string, sku: string, value: ThresholdFormValue): Observable<void> {
    return this.adminApi.updateReplenishmentThreshold(warehouseId, sku, value, crypto.randomUUID()).pipe(map(() => undefined));
  }

  reconcile(warehouseId: string, sku: string, value: ReconcileFormValue): Observable<void> {
    return this.adminApi.reconcileStock(warehouseId, sku, value, crypto.randomUUID()).pipe(map(() => undefined));
  }
}
