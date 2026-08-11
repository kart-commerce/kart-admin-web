import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Modal } from '../../../../shared/ui/modal/modal';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { ProductResponse } from '../../../../core/http/generated/product/v1';
import { ProductManagementService } from '../data/product-management.service';

export interface ProductFormContext {
  readonly mode: 'create' | 'edit';
  readonly product?: ProductResponse;
}

/**
 * What actually landed, for the list to render immediately. The list's own data source
 * (kart-search-service's OpenSearch index) only catches up with a create/update/deactivate a
 * few seconds later via RabbitMQ - reloading from it right after a save briefly showed the old
 * row (or none at all), which reads as "did my save even work?" to a real admin. This carries
 * enough of the just-saved values for the list to patch its own row instead of waiting.
 */
export interface ProductSaved {
  readonly sku: string;
  readonly name: string;
  readonly description?: string;
  readonly categoryId: string;
  readonly price: { amount: number; currency: string };
}

/** CAT-1's create/edit modal. */
@Component({
  selector: 'kart-product-form',
  imports: [ReactiveFormsModule, Modal, FormField, KartInput, Button, Alert],
  templateUrl: './product-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductForm {
  private readonly fb = inject(FormBuilder);
  private readonly productManagementService = inject(ProductManagementService);

  protected readonly context = signal<ProductFormContext | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  readonly saved = output<ProductSaved>();

  // sku is required: kart-admin-service's CreateProductCommandValidator rejects an empty SKU
  // (Product Service has no auto-assignment path), so this is enforced client-side too - the
  // control is disabled in edit mode, and disabled controls are excluded from form validity.
  protected readonly form = this.fb.nonNullable.group({
    sku: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    categoryId: ['', [Validators.required]],
    priceAmount: [0, [Validators.required, Validators.min(0.01)]],
    priceCurrency: ['USD', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
  });

  open(context: ProductFormContext): void {
    this.context.set(context);
    this.errorMessage.set(null);
    this.form.reset({
      sku: context.product?.sku ?? '',
      name: context.product?.name ?? '',
      description: context.product?.description ?? '',
      categoryId: context.product?.category?.id ?? '',
      priceAmount: context.product?.price?.amount ?? 0,
      priceCurrency: context.product?.price?.currency ?? 'USD',
    });
    if (context.mode === 'edit') {
      this.form.controls.sku.disable();
    } else {
      this.form.controls.sku.enable();
    }
  }

  close(): void {
    this.context.set(null);
  }

  submit(): void {
    const context = this.context();
    if (!context || this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const value = this.form.getRawValue();
    const formValue = {
      name: value.name,
      description: value.description || undefined,
      categoryId: value.categoryId,
      price: { amount: value.priceAmount, currency: value.priceCurrency },
      sku: value.sku || undefined,
    };

    const request$ =
      context.mode === 'create'
        ? this.productManagementService.createProduct(formValue)
        : this.productManagementService.updateProduct(context.product!.sku, formValue, context.product!.lastUpdatedAt);

    const sku = context.mode === 'create' ? value.sku : context.product!.sku;

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.close();
        this.saved.emit({ sku, name: value.name, description: formValue.description, categoryId: value.categoryId, price: formValue.price });
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not save this product. Try again.'));
      },
    });
  }
}
