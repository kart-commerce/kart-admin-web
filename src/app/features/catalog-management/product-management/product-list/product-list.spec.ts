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

  it('deactivates a product after confirmation and removes it from the list locally', () => {
    // Not a reload: kart-search-service's index only catches up with the deactivate a few
    // seconds later via RabbitMQ, so reloading here would still list it as Active.
    spyOn(window, 'confirm').and.returnValue(true);
    productManagementService.deactivateProduct.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();

    fixture.componentInstance.deactivate(searchResponse.results[0]);

    expect(productManagementService.deactivateProduct).toHaveBeenCalledWith('SKU-1');
    expect(productManagementService.listProducts).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance['results']()).toEqual([]);
  });

  it('onSaved prepends a newly created product without waiting for a reload', () => {
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();

    fixture.componentInstance.onSaved({ sku: 'SKU-2', name: 'Gadget', categoryId: 'cat-2', price: { amount: 5, currency: 'USD' } });

    expect(productManagementService.listProducts).toHaveBeenCalledTimes(1);
    const results = fixture.componentInstance['results']();
    expect(results.map((r) => r.sku)).toEqual(['SKU-2', 'SKU-1']);
  });

  it('onSaved patches an existing product in place, preserving its brand and rating', () => {
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();

    fixture.componentInstance.onSaved({ sku: 'SKU-1', name: 'Widget v2', categoryId: 'cat-1', price: { amount: 12.5, currency: 'USD' } });

    const [result] = fixture.componentInstance['results']();
    expect(result.name).toBe('Widget v2');
    expect(result.price).toEqual({ amount: 12.5, currency: 'USD' });
    expect(result.brand).toBe('Acme');
    expect(result.rating).toEqual({ avg: 4.5, count: 10 });
  });

  it('does not deactivate without confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const fixture = TestBed.createComponent(ProductList);
    fixture.detectChanges();

    fixture.componentInstance.deactivate(searchResponse.results[0]);

    expect(productManagementService.deactivateProduct).not.toHaveBeenCalled();
  });
});
