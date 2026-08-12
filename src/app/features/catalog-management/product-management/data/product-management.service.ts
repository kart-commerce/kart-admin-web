import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, retry, throwError, timer } from 'rxjs';

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

  // A SKU created (or, before this session, deactivated) moments ago can 404 here for a couple
  // of seconds - kart-product-service's own read model is a separate, async-projected copy of
  // the write it just accepted (edge-cases.md's "Read-model staleness" family), not something
  // this call can wait out on the server side. Retrying a plain 404 a few times with backoff
  // covers the realistic "clicked Edit right after Save" case without masking a real not-found.
  //
  // Budget must comfortably exceed kart-product-service's own OutboxRelayHostedService poll
  // interval (5s, product-service's own OutboxRelayHostedService.cs) — that's the dominant term
  // in create-to-read-model-ready latency (outbox row sits unpublished until the next poll tick,
  // then publish -> self-consume -> Mongo upsert is near-instant). A budget under that is not
  // "usually enough", it's a coin flip: an admin who clicks Edit inside the first ~5s after Save
  // has roughly even odds of landing in the unpublished window depending on exactly when their
  // create wrote its outbox row relative to the last poll tick. Found live via this exact race in
  // a real browser run (2026-08-11): 3 retries capped at 3s total wall-clock, actual relay lag was
  // 3.7s, admin saw a hard "Couldn't load this product's detail." with no automatic recovery.
  // 5 retries at 1000ms*retryCount gives attempts at t=0/1000/3000/6000/10000/15000ms - the 4th
  // attempt alone (t=6000ms) already clears the 5s poll interval with margin in the common case.
  getProduct(sku: string): Observable<ProductResponse> {
    return this.productReadApi.getProduct(sku).pipe(
      retry({
        count: 5,
        delay: (error: unknown, retryCount) =>
          error instanceof HttpErrorResponse && error.status === 404 ? timer(1000 * retryCount) : throwError(() => error),
      }),
    );
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
