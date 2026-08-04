import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

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
