import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { DataTableShell } from '../../../../shared/ui/data-table-shell/data-table-shell';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { RequiresGrant } from '../../../../core/auth/requires-grant.directive';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { StockLevel } from '../../../../core/http/generated/inventory/v1';
import { InventoryReplenishmentService } from '../data/inventory-replenishment.service';

/**
 * CAT-4: Inventory Replenishment, extended by the Inventory & Stock Management flow into the
 * flow's full Inventory Dashboard — SKU/warehouse lookup, replenish, provision a new (warehouseId,
 * sku) row, update the low-stock threshold, reconcile a physical count (Update Qty / Stock
 * Audit/Reconciliation), and view the Reorder Alert list.
 */
@Component({
  selector: 'kart-inventory-replenishment',
  imports: [ReactiveFormsModule, Card, DataTableShell, FormField, KartInput, Button, Alert, RequiresGrant],
  templateUrl: './inventory-replenishment.html',
  styleUrl: './inventory-replenishment.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryReplenishment {
  private readonly fb = inject(FormBuilder);
  private readonly inventoryReplenishmentService = inject(InventoryReplenishmentService);

  protected readonly lookupForm = this.fb.nonNullable.group({
    sku: ['', [Validators.required]],
    warehouseId: [''],
  });

  protected readonly replenishForm = this.fb.nonNullable.group({
    warehouseId: ['', [Validators.required]],
    qtyAdded: [1, [Validators.required, Validators.min(1)]],
    reason: [''],
  });

  protected readonly thresholdForm = this.fb.nonNullable.group({
    replenishmentThreshold: [0, [Validators.required, Validators.min(0)]],
    targetStockingLevel: [1, [Validators.required, Validators.min(1)]],
  });

  protected readonly reconcileForm = this.fb.nonNullable.group({
    countedQty: [0, [Validators.required, Validators.min(0)]],
    reason: ['', [Validators.required]],
  });

  protected readonly provisionForm = this.fb.nonNullable.group({
    warehouseId: ['', [Validators.required]],
    sku: ['', [Validators.required]],
    initialQty: [0, [Validators.required, Validators.min(0)]],
    replenishmentThreshold: [0, [Validators.required, Validators.min(0)]],
    targetStockingLevel: [1, [Validators.required, Validators.min(1)]],
  });

  protected readonly looking = signal(false);
  protected readonly lookupError = signal<string | null>(null);
  protected readonly stockLevel = signal<StockLevel | null>(null);

  protected readonly replenishing = signal(false);
  protected readonly replenishError = signal<string | null>(null);
  protected readonly replenishSuccess = signal<string | null>(null);

  protected readonly updatingThreshold = signal(false);
  protected readonly thresholdError = signal<string | null>(null);
  protected readonly thresholdSuccess = signal<string | null>(null);

  protected readonly reconciling = signal(false);
  protected readonly reconcileError = signal<string | null>(null);
  protected readonly reconcileSuccess = signal<string | null>(null);

  protected readonly provisioning = signal(false);
  protected readonly provisionError = signal<string | null>(null);
  protected readonly provisionSuccess = signal<string | null>(null);

  protected readonly loadingLowStock = signal(false);
  protected readonly lowStockError = signal<string | null>(null);
  protected readonly lowStockLoaded = signal(false);
  protected readonly lowStock = signal<StockLevel[]>([]);

  /**
   * `refreshOnly`: replenish/reconcile both re-run this lookup after a successful write, purely
   * to show the now-current stock level - that refresh must NOT clear the success message the
   * write itself just set (both calls are synchronous-observable-safe in tests, and even with a
   * real async HTTP round-trip, clearing eagerly here would still race the write's own success
   * signal in the same macrotask). Only a manual "Look up stock" click (refreshOnly=false, the
   * default) should clear stale write-result messages.
   */
  lookup(refreshOnly = false): void {
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      return;
    }

    this.looking.set(true);
    this.lookupError.set(null);
    this.stockLevel.set(null);
    if (!refreshOnly) {
      this.replenishSuccess.set(null);
      this.thresholdSuccess.set(null);
      this.reconcileSuccess.set(null);
    }
    const { sku, warehouseId } = this.lookupForm.getRawValue();

    this.inventoryReplenishmentService.getStockLevel(sku, warehouseId || undefined).subscribe({
      next: (stockLevel) => {
        this.looking.set(false);
        this.stockLevel.set(stockLevel);
        this.replenishForm.patchValue({ warehouseId: warehouseId || '' });
      },
      error: (error: unknown) => {
        this.looking.set(false);
        this.lookupError.set(extractErrorMessage(error, 'No stock record found for this SKU.'));
      },
    });
  }

  replenish(): void {
    const stockLevel = this.stockLevel();
    if (!stockLevel || this.replenishForm.invalid || this.replenishing()) {
      this.replenishForm.markAllAsTouched();
      return;
    }

    this.replenishing.set(true);
    this.replenishError.set(null);
    this.replenishSuccess.set(null);
    const value = this.replenishForm.getRawValue();

    this.inventoryReplenishmentService.replenish(stockLevel.sku, value).subscribe({
      next: () => {
        this.replenishing.set(false);
        this.replenishSuccess.set(`Replenished ${value.qtyAdded} units of ${stockLevel.sku}.`);
        this.lookup(true);
      },
      error: (error: unknown) => {
        this.replenishing.set(false);
        this.replenishError.set(extractErrorMessage(error, 'Could not replenish this SKU. Try again.'));
      },
    });
  }

  /** Requires a warehouse-scoped lookup first - threshold/reconcile both key on the natural (warehouseId, sku) pair, not the platform-wide summed view. */
  private warehouseScopedStock(): StockLevel | null {
    const stock = this.stockLevel();
    return stock?.warehouseId ? stock : null;
  }

  updateThreshold(): void {
    const stock = this.warehouseScopedStock();
    if (!stock || !stock.warehouseId || this.thresholdForm.invalid || this.updatingThreshold()) {
      this.thresholdForm.markAllAsTouched();
      return;
    }

    this.updatingThreshold.set(true);
    this.thresholdError.set(null);
    this.thresholdSuccess.set(null);
    const value = this.thresholdForm.getRawValue();

    this.inventoryReplenishmentService.updateThreshold(stock.warehouseId, stock.sku, value).subscribe({
      next: () => {
        this.updatingThreshold.set(false);
        this.thresholdSuccess.set(`Threshold updated for ${stock.sku} at ${stock.warehouseId}.`);
      },
      error: (error: unknown) => {
        this.updatingThreshold.set(false);
        this.thresholdError.set(extractErrorMessage(error, 'Could not update the threshold. Try again.'));
      },
    });
  }

  reconcile(): void {
    const stock = this.warehouseScopedStock();
    if (!stock || !stock.warehouseId || this.reconcileForm.invalid || this.reconciling()) {
      this.reconcileForm.markAllAsTouched();
      return;
    }

    this.reconciling.set(true);
    this.reconcileError.set(null);
    this.reconcileSuccess.set(null);
    const value = this.reconcileForm.getRawValue();
    const variance = value.countedQty - stock.availableQty;

    this.inventoryReplenishmentService.reconcile(stock.warehouseId, stock.sku, value).subscribe({
      next: () => {
        this.reconciling.set(false);
        const sign = variance > 0 ? '+' : '';
        this.reconcileSuccess.set(`Reconciled ${stock.sku} at ${stock.warehouseId} to ${value.countedQty} (variance ${sign}${variance}).`);
        this.lookup(true);
      },
      error: (error: unknown) => {
        this.reconciling.set(false);
        this.reconcileError.set(extractErrorMessage(error, 'Could not reconcile this SKU. Try again.'));
      },
    });
  }

  provision(): void {
    if (this.provisionForm.invalid || this.provisioning()) {
      this.provisionForm.markAllAsTouched();
      return;
    }

    this.provisioning.set(true);
    this.provisionError.set(null);
    this.provisionSuccess.set(null);
    const value = this.provisionForm.getRawValue();

    this.inventoryReplenishmentService.provision(value).subscribe({
      next: () => {
        this.provisioning.set(false);
        this.provisionSuccess.set(`Provisioned ${value.sku} at ${value.warehouseId} with ${value.initialQty} units.`);
        this.lookupForm.patchValue({ sku: value.sku, warehouseId: value.warehouseId });
        this.lookup(true);
      },
      error: (error: unknown) => {
        this.provisioning.set(false);
        this.provisionError.set(extractErrorMessage(error, 'Could not provision this warehouse/SKU. Try again.'));
      },
    });
  }

  loadLowStock(): void {
    this.loadingLowStock.set(true);
    this.lowStockError.set(null);

    this.inventoryReplenishmentService.getLowStock().subscribe({
      next: (rows) => {
        this.loadingLowStock.set(false);
        this.lowStockLoaded.set(true);
        this.lowStock.set(rows);
      },
      error: (error: unknown) => {
        this.loadingLowStock.set(false);
        this.lowStockError.set(extractErrorMessage(error, 'Could not load the reorder alert list. Try again.'));
      },
    });
  }
}
