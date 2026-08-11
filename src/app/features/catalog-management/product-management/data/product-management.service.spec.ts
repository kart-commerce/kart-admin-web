import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { ProductReadApiService } from '../../../../core/http/generated/product/v1';
import { SearchApiService } from '../../../../core/http/generated/search/v1';
import { ProductManagementService } from './product-management.service';

describe('ProductManagementService', () => {
  let service: ProductManagementService;
  let searchApi: jasmine.SpyObj<SearchApiService>;
  let productReadApi: jasmine.SpyObj<ProductReadApiService>;
  let adminApi: jasmine.SpyObj<AdminApiService>;

  beforeEach(() => {
    searchApi = jasmine.createSpyObj<SearchApiService>('SearchApiService', ['search']);
    productReadApi = jasmine.createSpyObj<ProductReadApiService>('ProductReadApiService', ['getProduct']);
    adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['createProduct', 'updateProduct', 'deactivateProduct']);
    TestBed.configureTestingModule({
      providers: [
        { provide: SearchApiService, useValue: searchApi },
        { provide: ProductReadApiService, useValue: productReadApi },
        { provide: AdminApiService, useValue: adminApi },
      ],
    });
    service = TestBed.inject(ProductManagementService);
  });

  it('listProducts() delegates to search', () => {
    searchApi.search.and.returnValue(of({} as any));
    service.listProducts({ q: 'phone' }).subscribe();
    expect(searchApi.search).toHaveBeenCalledWith({ q: 'phone' });
  });

  it('getProduct() reads from product-service directly', () => {
    productReadApi.getProduct.and.returnValue(of({} as any));
    service.getProduct('SKU-1').subscribe();
    expect(productReadApi.getProduct).toHaveBeenCalledWith('SKU-1');
  });

  it('getProduct() retries a 404 (read-model projection lag right after create/update) and succeeds', async () => {
    // retry() resubscribes to the *same* observable getProduct() returned - like the real
    // HttpClient-backed call, each subscription must independently decide to fail or succeed.
    const notFound = new HttpErrorResponse({ status: 404 });
    let subscriptionCount = 0;
    productReadApi.getProduct.and.returnValue(
      new Observable((subscriber) => {
        subscriptionCount++;
        if (subscriptionCount === 1) {
          subscriber.error(notFound);
        } else {
          subscriber.next({ sku: 'SKU-1' } as any);
          subscriber.complete();
        }
      }),
    );

    const result = await firstValueFrom(service.getProduct('SKU-1'));

    expect(result).toEqual({ sku: 'SKU-1' } as any);
    expect(subscriptionCount).toBe(2);
    expect(productReadApi.getProduct).toHaveBeenCalledTimes(1);
  });

  it('getProduct() does not retry a non-404 failure', async () => {
    const serverError = new HttpErrorResponse({ status: 500 });
    productReadApi.getProduct.and.returnValue(throwError(() => serverError));

    await expectAsync(firstValueFrom(service.getProduct('SKU-1'))).toBeRejectedWith(serverError);
    expect(productReadApi.getProduct).toHaveBeenCalledTimes(1);
  });

  it("getProduct() retry budget comfortably outlasts product-service's own 5s outbox poll interval", () => {
    // Found live in a real browser run (2026-08-11): kart-product-service's OutboxRelayHostedService
    // polls every 5s, so create-to-read-model-ready latency can genuinely reach ~4-5s. A retry
    // budget that gives up before then isn't "usually enough" - it's a coin flip on every
    // click-Edit-right-after-Save. This asserts the 4th attempt (still one retry short of the full
    // 5-retry budget) doesn't fire until the delays sum past the 5s mark, so the common case has
    // margin, not just the very last possible attempt.
    jasmine.clock().install();
    try {
      const notFound = new HttpErrorResponse({ status: 404 });
      let subscriptionCount = 0;
      productReadApi.getProduct.and.returnValue(
        new Observable((subscriber) => {
          subscriptionCount++;
          if (subscriptionCount < 4) {
            subscriber.error(notFound);
          } else {
            subscriber.next({ sku: 'SKU-1' } as any);
            subscriber.complete();
          }
        }),
      );

      let result: unknown;
      service.getProduct('SKU-1').subscribe((value) => (result = value));

      // Delays before each retry are 1000*retryCount: 1000ms, then 2000ms, then 3000ms - the 4th
      // (successful) attempt only fires once all three have elapsed (6000ms total), which is what
      // gives this budget its margin over product-service's 5s poll interval.
      jasmine.clock().tick(1000);
      jasmine.clock().tick(2000);
      jasmine.clock().tick(3000);

      expect(subscriptionCount).toBe(4);
      expect(result).toEqual({ sku: 'SKU-1' } as any);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('createProduct() calls the admin proxy', () => {
    adminApi.createProduct.and.returnValue(of({} as any));
    service
      .createProduct({ name: 'Widget', categoryId: 'cat-1', price: { amount: 10, currency: 'USD' }, sku: 'SKU-1' })
      .subscribe();
    expect(adminApi.createProduct).toHaveBeenCalledWith(
      { name: 'Widget', description: undefined, categoryId: 'cat-1', price: { amount: 10, currency: 'USD' }, sku: 'SKU-1' },
      jasmine.any(String),
    );
  });

  it('updateProduct() forwards lastUpdatedAt as If-Match', () => {
    adminApi.updateProduct.and.returnValue(of({} as any));
    service.updateProduct('SKU-1', { name: 'Widget', categoryId: 'cat-1', price: { amount: 10, currency: 'USD' } }, '2026-01-01T00:00:00Z').subscribe();
    expect(adminApi.updateProduct).toHaveBeenCalledWith(
      'SKU-1',
      { name: 'Widget', description: undefined, categoryId: 'cat-1', price: { amount: 10, currency: 'USD' } },
      '2026-01-01T00:00:00Z',
      jasmine.any(String),
    );
  });

  it('deactivateProduct() calls the admin proxy', () => {
    adminApi.deactivateProduct.and.returnValue(of({} as any));
    service.deactivateProduct('SKU-1').subscribe();
    expect(adminApi.deactivateProduct).toHaveBeenCalledWith('SKU-1', jasmine.any(String));
  });
});
