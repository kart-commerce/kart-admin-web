import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Card } from '../../../../shared/ui/card/card';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { RequiresGrant } from '../../../../core/auth/requires-grant.directive';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { StockLevel } from '../../../../core/http/generated/inventory/v1';
import { InventoryReplenishmentService } from '../data/inventory-replenishment.service';

/** CAT-4: Inventory Replenishment — SKU lookup + manual restock trigger. */
@Component({
  selector: 'kart-inventory-replenishment',
  imports: [ReactiveFormsModule, Card, FormField, KartInput, Button, Alert, RequiresGrant],
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

  protected readonly looking = signal(false);
  protected readonly lookupError = signal<string | null>(null);
  protected readonly stockLevel = signal<StockLevel | null>(null);

  protected readonly replenishing = signal(false);
  protected readonly replenishError = signal<string | null>(null);
  protected readonly replenishSuccess = signal<string | null>(null);

  lookup(): void {
    if (this.lookupForm.invalid) {
      this.lookupForm.markAllAsTouched();
      return;
    }

    this.looking.set(true);
    this.lookupError.set(null);
    this.stockLevel.set(null);
    this.replenishSuccess.set(null);
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
        this.lookup();
      },
      error: (error: unknown) => {
        this.replenishing.set(false);
        this.replenishError.set(extractErrorMessage(error, 'Could not replenish this SKU. Try again.'));
      },
    });
  }
}
