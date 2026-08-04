import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CategoryManagementService } from '../data/category-management.service';
import { CategoryForm } from './category-form';

describe('CategoryForm', () => {
  let categoryManagementService: jasmine.SpyObj<CategoryManagementService>;

  beforeEach(() => {
    categoryManagementService = jasmine.createSpyObj('CategoryManagementService', ['createCategory', 'updateCategory']);
    TestBed.configureTestingModule({
      imports: [CategoryForm],
      providers: [{ provide: CategoryManagementService, useValue: categoryManagementService }],
    });
  });

  it('is closed until open() is called', () => {
    const fixture = TestBed.createComponent(CategoryForm);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('creates a category with the given parentId', () => {
    categoryManagementService.createCategory.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(CategoryForm);
    fixture.componentInstance.open({ mode: 'create', parentId: 'parent-1' });
    fixture.detectChanges();

    fixture.componentInstance['form'].setValue({ name: 'New Category' });
    let saved = false;
    fixture.componentInstance.saved.subscribe(() => (saved = true));
    fixture.componentInstance.submit();

    expect(categoryManagementService.createCategory).toHaveBeenCalledWith({
      name: 'New Category',
      parentId: 'parent-1',
      displayOrder: 0,
    });
    expect(saved).toBeTrue();
  });

  it('prefills the name and updates an existing category on edit', () => {
    categoryManagementService.updateCategory.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(CategoryForm);
    fixture.componentInstance.open({
      mode: 'edit',
      parentId: null,
      category: { categoryId: 'cat-1', name: 'Old Name', depth: 0, status: 'active' },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance['form'].value.name).toBe('Old Name');

    fixture.componentInstance['form'].setValue({ name: 'Renamed' });
    fixture.componentInstance.submit();

    expect(categoryManagementService.updateCategory).toHaveBeenCalledWith('cat-1', {
      name: 'Renamed',
      parentId: null,
      displayOrder: 0,
    });
  });

  it('surfaces an error message on failure', () => {
    categoryManagementService.createCategory.and.returnValue(throwError(() => ({ error: { message: 'Name taken.' } })));
    const fixture = TestBed.createComponent(CategoryForm);
    fixture.componentInstance.open({ mode: 'create', parentId: null });
    fixture.detectChanges();
    fixture.componentInstance['form'].setValue({ name: 'Dup' });
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance['errorMessage']()).toBe('Name taken.');
  });
});
