import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '../../../../shared/ui/button/button';
import { DataTableShell } from '../../../../shared/ui/data-table-shell/data-table-shell';
import { KartInput } from '../../../../shared/ui/kart-input.directive';
import { RequiresGrant } from '../../../../core/auth/requires-grant.directive';
import { extractErrorMessage } from '../../../../core/auth/problem';
import { SearchResultItem } from '../../../../core/http/generated/search/v1';
import { ProductForm } from '../product-form/product-form';
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

  deactivate(item: SearchResultItem): void {
    if (!confirm(`Deactivate ${item.name} (${item.sku})? This removes it from the storefront.`)) {
      return;
    }
    this.deactivatingSku.set(item.sku);
    this.productManagementService.deactivateProduct(item.sku).subscribe({
      next: () => {
        this.deactivatingSku.set(null);
        this.load();
      },
      error: (error: unknown) => {
        this.deactivatingSku.set(null);
        this.errorMessage.set(extractErrorMessage(error, "Couldn't deactivate this product."));
      },
    });
  }
}
