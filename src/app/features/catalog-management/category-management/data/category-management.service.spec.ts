import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { CategoryReadApiService } from '../../../../core/http/generated/category/v1';
import { CategoryManagementService } from './category-management.service';

describe('CategoryManagementService', () => {
  let service: CategoryManagementService;
  let categoryReadApi: jasmine.SpyObj<CategoryReadApiService>;
  let adminApi: jasmine.SpyObj<AdminApiService>;

  beforeEach(() => {
    categoryReadApi = jasmine.createSpyObj<CategoryReadApiService>('CategoryReadApiService', ['listCategories']);
    adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', [
      'createCategory',
      'updateCategory',
      'reorderCategory',
      'moveCategory',
    ]);
    TestBed.configureTestingModule({
      providers: [
        { provide: CategoryReadApiService, useValue: categoryReadApi },
        { provide: AdminApiService, useValue: adminApi },
      ],
    });
    service = TestBed.inject(CategoryManagementService);
  });

  it('listChildren() reads direct children by parentId', () => {
    categoryReadApi.listCategories.and.returnValue(of([]));
    service.listChildren('cat-1').subscribe();
    expect(categoryReadApi.listCategories).toHaveBeenCalledWith({ parentId: 'cat-1', includeDeprecated: false });
  });

  it('listChildren() lists top-level categories when parentId is null', () => {
    categoryReadApi.listCategories.and.returnValue(of([]));
    service.listChildren(null).subscribe();
    expect(categoryReadApi.listCategories).toHaveBeenCalledWith({ parentId: undefined, includeDeprecated: false });
  });

  it('createCategory() calls the admin proxy with a generated idempotency key', () => {
    adminApi.createCategory.and.returnValue(of({} as any));
    service.createCategory({ name: 'Electronics', parentId: null, displayOrder: 0 }).subscribe();
    expect(adminApi.createCategory).toHaveBeenCalledWith(
      { name: 'Electronics', parentId: null, displayOrder: 0 },
      jasmine.any(String),
    );
  });

  it('updateCategory() sends the RFC 7232 wildcard If-Match', () => {
    adminApi.updateCategory.and.returnValue(of({} as any));
    service.updateCategory('cat-1', { name: 'Electronics', parentId: null, displayOrder: 1 }).subscribe();
    expect(adminApi.updateCategory).toHaveBeenCalledWith(
      'cat-1',
      { name: 'Electronics', parentId: null, displayOrder: 1 },
      '*',
      jasmine.any(String),
    );
  });

  it('moveCategory() calls the admin proxy', () => {
    adminApi.moveCategory.and.returnValue(of({} as any));
    service.moveCategory('cat-1', 'cat-2').subscribe();
    expect(adminApi.moveCategory).toHaveBeenCalledWith('cat-1', 'cat-2', jasmine.any(String));
  });

  it('listAllActiveCategoriesFlattened() walks the tree depth-first into one indented list', (done) => {
    categoryReadApi.listCategories.and.callFake(({ parentId } = {}) => {
      if (parentId === undefined) {
        return of([{ categoryId: 'electronics', name: 'Electronics', depth: 1, displayOrder: 0, status: 'active' as const }]);
      }
      if (parentId === 'electronics') {
        return of([{ categoryId: 'phones', name: 'Phones', parentId: 'electronics', depth: 2, displayOrder: 0, status: 'active' as const }]);
      }
      return of([]);
    });

    service.listAllActiveCategoriesFlattened().subscribe((options) => {
      expect(options).toEqual([
        { categoryId: 'electronics', label: 'Electronics', depth: 0 },
        { categoryId: 'phones', label: '— Phones', depth: 1 },
      ]);
      done();
    });
  });
});
