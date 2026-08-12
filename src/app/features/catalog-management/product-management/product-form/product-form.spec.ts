import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CategoryManagementService } from '../../category-management/data/category-management.service';
import { ProductManagementService } from '../data/product-management.service';
import { ProductForm } from './product-form';

describe('ProductForm', () => {
  let productManagementService: jasmine.SpyObj<ProductManagementService>;
  let categoryManagementService: jasmine.SpyObj<CategoryManagementService>;

  beforeEach(() => {
    productManagementService = jasmine.createSpyObj('ProductManagementService', ['createProduct', 'updateProduct']);
    categoryManagementService = jasmine.createSpyObj('CategoryManagementService', ['listAllActiveCategoriesFlattened']);
    categoryManagementService.listAllActiveCategoriesFlattened.and.returnValue(
      of([{ categoryId: 'cat-1', label: 'Electronics', depth: 0 }]),
    );
    TestBed.configureTestingModule({
      imports: [ProductForm],
      providers: [
        { provide: ProductManagementService, useValue: productManagementService },
        { provide: CategoryManagementService, useValue: categoryManagementService },
      ],
    });
  });

  it('creates a product from form values', () => {
    productManagementService.createProduct.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(ProductForm);
    fixture.componentInstance.open({ mode: 'create' });
    fixture.detectChanges();

    fixture.componentInstance['form'].setValue({
      sku: 'SKU-1',
      name: 'Widget',
      description: '',
      categoryId: 'cat-1',
      priceAmount: 19.99,
      priceCurrency: 'USD',
    });
    fixture.componentInstance.submit();

    expect(productManagementService.createProduct).toHaveBeenCalledWith({
      name: 'Widget',
      description: undefined,
      categoryId: 'cat-1',
      price: { amount: 19.99, currency: 'USD' },
      sku: 'SKU-1',
    });
  });

  it('updates a product, forwarding lastUpdatedAt', () => {
    productManagementService.updateProduct.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(ProductForm);
    fixture.componentInstance.open({
      mode: 'edit',
      product: {
        sku: 'SKU-1',
        name: 'Widget',
        price: { amount: 19.99, currency: 'USD' },
        status: 'Active',
        lastUpdatedAt: '2026-01-01T00:00:00Z',
      },
    });
    fixture.detectChanges();

    fixture.componentInstance['form'].patchValue({ name: 'Widget v2', categoryId: 'cat-1' });
    fixture.componentInstance.submit();

    expect(productManagementService.updateProduct).toHaveBeenCalledWith(
      'SKU-1',
      jasmine.objectContaining({ name: 'Widget v2' }),
      '2026-01-01T00:00:00Z',
    );
  });

  it('does not submit a create with no SKU (Product Service has no auto-assignment)', () => {
    productManagementService.createProduct.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(ProductForm);
    fixture.componentInstance.open({ mode: 'create' });
    fixture.detectChanges();

    fixture.componentInstance['form'].patchValue({ name: 'Widget', categoryId: 'cat-1', priceAmount: 9.99 });
    fixture.componentInstance.submit();

    expect(productManagementService.createProduct).not.toHaveBeenCalled();
  });

  it('surfaces an error message on failure', () => {
    productManagementService.createProduct.and.returnValue(throwError(() => ({ error: { message: 'SKU taken.' } })));
    const fixture = TestBed.createComponent(ProductForm);
    fixture.componentInstance.open({ mode: 'create' });
    fixture.detectChanges();
    fixture.componentInstance['form'].patchValue({ sku: 'SKU-1', name: 'Widget', categoryId: 'cat-1', priceAmount: 9.99 });
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance['errorMessage']()).toBe('SKU taken.');
  });
});
