import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { ProductReadApiService, ProductResponse } from '../../../../core/http/generated/product/v1';
import { SearchApiService, SearchResponse } from '../../../../core/http/generated/search/v1';

export interface ProductFormValue {
  name: string;
  description?: string;
  categoryId: string;
  price: { amount: number; currency: string };
  sku?: string;
}

/**
 * CAT-1's data layer. List reads go through kart-search-service's
 * `GET /v1/search` (an empty query browses all Active products) since
 * kart-product-service itself exposes no list endpoint; single-product
 * detail reads go straight to kart-product-service's own
 * `GET /v1/products/{sku}`; every write goes through kart-admin-service's
 * `/admin/products/*` proxy (CAT-1's design source).
 */
@Injectable({ providedIn: 'root' })
export class ProductManagementService {
  private readonly searchApi = inject(SearchApiService);
  private readonly productReadApi = inject(ProductReadApiService);
  private readonly adminApi = inject(AdminApiService);

  listProducts(query: { q?: string; page?: number; size?: number } = {}): Observable<SearchResponse> {
    return this.searchApi.search(query);
  }

  getProduct(sku: string): Observable<ProductResponse> {
    return this.productReadApi.getProduct(sku);
  }

  createProduct(value: ProductFormValue): Observable<void> {
    return this.adminApi
      .createProduct(
        { name: value.name, description: value.description, categoryId: value.categoryId, price: value.price, sku: value.sku },
        crypto.randomUUID(),
      )
      .pipe(map(() => undefined));
  }

  /**
   * `ProductResponse` has no explicit version/ETag field either — this uses
   * `lastUpdatedAt` (the one field that changes on every write) as the
   * `If-Match` precondition kart-admin-service's proxy forwards to Product
   * Service, a documented best-effort substitute for a real version token.
   */
  updateProduct(sku: string, value: ProductFormValue, lastUpdatedAt: string): Observable<void> {
    return this.adminApi
      .updateProduct(
        sku,
        { name: value.name, description: value.description, categoryId: value.categoryId, price: value.price },
        lastUpdatedAt,
        crypto.randomUUID(),
      )
      .pipe(map(() => undefined));
  }

  deactivateProduct(sku: string): Observable<void> {
    return this.adminApi.deactivateProduct(sku, crypto.randomUUID()).pipe(map(() => undefined));
  }
}
