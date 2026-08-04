import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ProductManagementService } from '../data/product-management.service';
import { ProductList } from './product-list';

describe('ProductList', () => {
  let productManagementService: jasmine.SpyObj<ProductManagementService>;

  const searchResponse = {
    results: [
      {
        sku: 'SKU-1',
        name: 'Widget',
        brand: 'Acme',
        category: { categoryId: 'cat-1', categoryName: 'Widgets' },
        price: { amount: 9.99, currency: 'USD' },
        availability: 'Active' as const,
        rating: { avg: 4.5, count: 10 },
      },
    ],
    facets: {},
    pagination: { page: 1, size: 20, totalHits: 1, totalHitsIsApproximate: false },
    truncated: false,
  };

  beforeEach(() => {
    productManagementService = jasmine.createSpyObj('ProductManagementService', [
      'listProducts',
      'getProduct',
      'deactivateProduct',
    ]);
    productManagementService.listProducts.and.returnValue(of(searchResponse));
    TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [{ provide: ProductManagementService, useValue: productManagementService }],
    });
  });

  it('loads and renders products', () => {
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Widget');
    expect(fixture.nativeElement.textContent).toContain('SKU-1');
  });

  it('shows an empty state with no results', () => {
    productManagementService.listProducts.and.returnValue(of({ ...searchResponse, results: [] }));
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No products found');
  });

  it('shows an error state on failure', () => {
    productManagementService.listProducts.and.returnValue(throwError(() => ({ error: { message: 'Search down' } })));
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Search down');
  });

  it('deactivates a product after confirmation and reloads', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    productManagementService.deactivateProduct.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();

    fixture.componentInstance.deactivate(searchResponse.results[0]);

    expect(productManagementService.deactivateProduct).toHaveBeenCalledWith('SKU-1');
    expect(productManagementService.listProducts).toHaveBeenCalledTimes(2);
  });

  it('does not deactivate without confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();

    fixture.componentInstance.deactivate(searchResponse.results[0]);

    expect(productManagementService.deactivateProduct).not.toHaveBeenCalled();
  });
});
