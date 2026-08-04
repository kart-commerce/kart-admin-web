import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CategoryManagementService } from '../data/category-management.service';
import { CategoryTree } from './category-tree';

describe('CategoryTree', () => {
  let categoryManagementService: jasmine.SpyObj<CategoryManagementService>;

  const rootCategories = [
    { categoryId: 'electronics', name: 'Electronics', depth: 0, status: 'active' as const },
    { categoryId: 'fashion', name: 'Fashion', depth: 0, status: 'active' as const },
  ];

  beforeEach(() => {
    categoryManagementService = jasmine.createSpyObj('CategoryManagementService', [
      'listChildren',
      'createCategory',
      'updateCategory',
      'reorderCategory',
      'moveCategory',
    ]);
    categoryManagementService.listChildren.and.returnValue(of(rootCategories));
    TestBed.configureTestingModule({
      imports: [CategoryTree],
      providers: [{ provide: CategoryManagementService, useValue: categoryManagementService }],
    });
  });

  it('loads and renders the top-level tree', () => {
    const fixture = TestBed.createComponent(CategoryTree);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Electronics');
    expect(fixture.nativeElement.textContent).toContain('Fashion');
  });

  it('shows an error state when the tree fails to load', () => {
    categoryManagementService.listChildren.and.returnValue(throwError(() => ({ error: { message: 'Down' } })));
    const fixture = TestBed.createComponent(CategoryTree);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Down');
  });

  it('shows an empty state when there are no categories', () => {
    categoryManagementService.listChildren.and.returnValue(of([]));
    const fixture = TestBed.createComponent(CategoryTree);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No categories yet');
  });

  it('lazily fetches children on first expand', () => {
    const fixture = TestBed.createComponent(CategoryTree);
    fixture.detectChanges();

    categoryManagementService.listChildren.and.returnValue(
      of([{ categoryId: 'phones', name: 'Phones', parentId: 'electronics', depth: 1, status: 'active' as const }]),
    );
    fixture.componentInstance.toggle(fixture.componentInstance['nodes']()[0]);
    fixture.detectChanges();

    expect(categoryManagementService.listChildren).toHaveBeenCalledWith('electronics');
    expect(fixture.componentInstance['nodes']()[0].expanded).toBeTrue();
    expect(fixture.componentInstance['nodes']()[0].children?.length).toBe(1);
  });

  it('swaps displayOrder with the adjacent sibling on moveUp', () => {
    categoryManagementService.reorderCategory.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(CategoryTree);
    fixture.detectChanges();

    fixture.componentInstance.moveUp(fixture.componentInstance['nodes']()[1]);

    expect(categoryManagementService.reorderCategory).toHaveBeenCalledWith('fashion', 0);
    expect(categoryManagementService.reorderCategory).toHaveBeenCalledWith('electronics', 1);
  });

  it('moves a category to a new parent', () => {
    categoryManagementService.moveCategory.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(CategoryTree);
    fixture.detectChanges();

    fixture.componentInstance.openMove(fixture.componentInstance['nodes']()[0]);
    fixture.componentInstance['moveNewParentId'] = 'fashion';
    fixture.componentInstance.submitMove();

    expect(categoryManagementService.moveCategory).toHaveBeenCalledWith('electronics', 'fashion');
  });
});
