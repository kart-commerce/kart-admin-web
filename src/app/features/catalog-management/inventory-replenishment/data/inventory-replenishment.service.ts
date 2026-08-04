import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { InventoryReadApiService, StockLevel } from '../../../../core/http/generated/inventory/v1';

export interface ReplenishFormValue {
  warehouseId: string;
  qtyAdded: number;
  reason?: string;
}

/**
 * CAT-4's data layer. Stock-level lookup goes straight to
 * kart-inventory-service's own `GET /inventory/{sku}` read path (public,
 * informational display); the actual replenishment write goes through
 * kart-admin-service's `/admin/inventory/{sku}/replenish` proxy (CAT-4's
 * design source) — the same write path the threshold-based automated
 * trigger uses, per that service's own requirement-spec.
 */
@Injectable({ providedIn: 'root' })
export class InventoryReplenishmentService {
  private readonly inventoryReadApi = inject(InventoryReadApiService);
  private readonly adminApi = inject(AdminApiService);

  getStockLevel(sku: string, warehouseId?: string): Observable<StockLevel> {
    return this.inventoryReadApi.getStockLevel(sku, warehouseId);
  }

  replenish(sku: string, value: ReplenishFormValue): Observable<void> {
    return this.adminApi
      .replenishInventory(sku, { warehouseId: value.warehouseId, qtyAdded: value.qtyAdded, reason: value.reason }, crypto.randomUUID())
      .pipe(map(() => undefined));
  }
}
