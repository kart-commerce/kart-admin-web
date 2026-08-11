import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '../../../../shared/ui/button/button';
import { DataTableShell } from '../../../../shared/ui/data-table-shell/data-table-shell';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { RequiresGrant } from '../../../../core/auth/requires-grant.directive';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { SearchResultItem } from '../../../../core/http/generated/search/v1';
import { ProductForm, ProductSaved } from '../product-form/product-form';
import { ProductManagementService } from '../data/product-management.service';

/** CAT-1: Product Management — list, create, update, deactivate a product. */
@Component({
  selector: 'kart-product-list',
  imports: [DataTableShell, Button, KartInput, FormsModule, RequiresGrant, ProductForm, DecimalPipe],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductList implements OnInit {
  private readonly productManagementService = inject(ProductManagementService);

  @ViewChild(ProductForm) private readonly productForm!: ProductForm;

  protected readonly results = signal<SearchResultItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly deactivatingSku = signal<string | null>(null);
  protected query = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.productManagementService.listProducts({ q: this.query || undefined }).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.results.set(response.results);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't load products."));
      },
    });
  }

  create(): void {
    this.productForm.open({ mode: 'create' });
  }

  edit(item: SearchResultItem): void {
    this.productManagementService.getProduct(item.sku).subscribe({
      next: (product) => this.productForm.open({ mode: 'edit', product }),
      error: (error: unknown) => this.errorMessage.set(extractErrorMessage(error, "Couldn't load this product's detail.")),
    });
  }

  // Patches the row in place rather than re-running load() - the list's data source
  // (kart-search-service) only catches up with this write a few seconds later via RabbitMQ, so
  // an immediate reload would show either the pre-save row or (for a brand-new SKU) nothing at
  // all, reading as a failed save. The next manual search/reload still lands on server truth.
  onSaved(saved: ProductSaved): void {
    const existing = this.results().find((item) => item.sku === saved.sku);
    const patched: SearchResultItem = {
      sku: saved.sku,
      name: saved.name,
      description: saved.description,
      brand: existing?.brand ?? null!,
      category: { categoryId: saved.categoryId, categoryName: existing?.category.categoryId === saved.categoryId ? existing.category.categoryName : null },
      price: saved.price,
      availability: 'Active',
      rating: existing?.rating ?? { avg: 0, count: 0 },
      size: existing?.size,
      color: existing?.color,
    };
    this.results.update((items) =>
      existing ? items.map((item) => (item.sku === saved.sku ? patched : item)) : [patched, ...items],
    );
  }

  deactivate(item: SearchResultItem): void {
    if (!confirm(`Deactivate ${item.name} (${item.sku})? This removes it from the storefront.`)) {
      return;
    }
    this.deactivatingSku.set(item.sku);
    this.productManagementService.deactivateProduct(item.sku).subscribe({
      next: () => {
        this.deactivatingSku.set(null);
        // Same staleness reason as onSaved: reloading here would still list it as Active for a
        // few seconds. It's gone from this admin's perspective now, so drop it locally.
        this.results.update((items) => items.filter((i) => i.sku !== item.sku));
      },
      error: (error: unknown) => {
        this.deactivatingSku.set(null);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't deactivate this product."));
      },
    });
  }
}
