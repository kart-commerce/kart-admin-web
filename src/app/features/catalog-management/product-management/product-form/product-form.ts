import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { FormField } from '../../../../shared/ui/form-field/form-field';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { Modal } from '../../../../shared/ui/modal/modal';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { ProductResponse } from '../../../../core/http/generated/product/v1';
import { CategoryManagementService, CategoryOption } from '../../category-management/data/category-management.service';
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
  private readonly categoryManagementService = inject(CategoryManagementService);

  protected readonly context = signal<ProductFormContext | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * The taxonomy, flattened for a real `<select>` picker - CAT-1's form previously had a raw
   * free-text `categoryId` input, requiring an admin to already know and correctly type the
   * category's id (see product-form's own prior doc history). Loaded once at construction,
   * shared across every open() call (categories rarely change mid-session; CategoryTree's own
   * write-through cache means a create/rename elsewhere in the same tab is reflected on next
   * navigation anyway).
   */
  protected readonly categoryOptions = signal<CategoryOption[]>([]);

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
    const categoryId = context.product?.category?.id ?? '';
    this.form.reset({
      sku: context.product?.sku ?? '',
      name: context.product?.name ?? '',
      description: context.product?.description ?? '',
      categoryId,
      priceAmount: context.product?.price?.amount ?? 0,
      priceCurrency: context.product?.price?.currency ?? 'USD',
    });
    if (context.mode === 'edit') {
      this.form.controls.sku.disable();
    } else {
      this.form.controls.sku.enable();
    }

    this.categoryManagementService.listAllActiveCategoriesFlattened().subscribe((options) => {
      // Edit mode on a product whose categoryId no longer resolves to any active category (e.g.
      // the category was since deprecated) still needs its current value selectable, rather than
      // silently falling back to a blank/wrong selection - append it as a clearly-marked entry.
      const hasCurrent = !categoryId || options.some((o) => o.categoryId === categoryId);
      this.categoryOptions.set(hasCurrent ? options : [...options, { categoryId, label: `${categoryId} (not found)`, depth: 0 }]);
    });
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
