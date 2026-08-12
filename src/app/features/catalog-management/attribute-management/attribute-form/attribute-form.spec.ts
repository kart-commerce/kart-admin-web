import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CategoryManagementService } from '../../category-management/data/category-management.service';
import { AttributeManagementService } from '../data/attribute-management.service';
import { AttributeForm } from './attribute-form';

describe('AttributeForm', () => {
  let attributeManagementService: jasmine.SpyObj<AttributeManagementService>;
  let categoryManagementService: jasmine.SpyObj<CategoryManagementService>;

  beforeEach(() => {
    attributeManagementService = jasmine.createSpyObj('AttributeManagementService', ['createAttribute', 'updateAttribute']);
    categoryManagementService = jasmine.createSpyObj('CategoryManagementService', ['listAllActiveCategoriesFlattened']);
    categoryManagementService.listAllActiveCategoriesFlattened.and.returnValue(of([{ categoryId: 'cat-1', label: 'Electronics', depth: 0 }]));
    TestBed.configureTestingModule({
      imports: [AttributeForm],
      providers: [
        { provide: AttributeManagementService, useValue: attributeManagementService },
        { provide: CategoryManagementService, useValue: categoryManagementService },
      ],
    });
  });

  it('is closed until open() is called', () => {
    const fixture = TestBed.createComponent(AttributeForm);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('creates a global text attribute with no values', () => {
    attributeManagementService.createAttribute.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(AttributeForm);
    fixture.componentInstance.open({ mode: 'create' });
    fixture.detectChanges();

    fixture.componentInstance['form'].patchValue({ name: 'Warranty period', categoryId: '', dataType: 'text' });
    fixture.componentInstance.submit();

    expect(attributeManagementService.createAttribute).toHaveBeenCalledWith({
      name: 'Warranty period',
      categoryId: null,
      dataType: 'text',
      values: [],
    });
  });

  it('creates a select attribute, forwarding the values array', () => {
    attributeManagementService.createAttribute.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(AttributeForm);
    fixture.componentInstance.open({ mode: 'create' });
    fixture.detectChanges();

    fixture.componentInstance['form'].patchValue({ name: 'Color', categoryId: 'cat-1', dataType: 'select' });
    fixture.componentInstance.addValue();
    fixture.componentInstance.valuesArray.at(0).patchValue({ value: 'Red', displayOrder: 0 });
    fixture.componentInstance.submit();

    expect(attributeManagementService.createAttribute).toHaveBeenCalledWith({
      name: 'Color',
      categoryId: 'cat-1',
      dataType: 'select',
      values: [{ value: 'Red', displayOrder: 0 }],
    });
  });

  it('prefills and updates an existing attribute, disabling categoryId/dataType', () => {
    attributeManagementService.updateAttribute.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(AttributeForm);
    fixture.componentInstance.open({
      mode: 'edit',
      attribute: { attributeId: 'attr-1', name: 'Color', categoryId: 'cat-1', dataType: 'select', values: [{ valueId: 'v1', value: 'Red', displayOrder: 0 }], status: 'active' },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance['form'].controls.categoryId.disabled).toBeTrue();
    expect(fixture.componentInstance['form'].controls.dataType.disabled).toBeTrue();

    fixture.componentInstance['form'].controls.name.setValue('Primary Color');
    fixture.componentInstance.submit();

    expect(attributeManagementService.updateAttribute).toHaveBeenCalledWith('attr-1', {
      name: 'Primary Color',
      categoryId: 'cat-1',
      dataType: 'select',
      values: [{ value: 'Red', displayOrder: 0 }],
    });
  });

  it('surfaces an error message on failure', () => {
    attributeManagementService.createAttribute.and.returnValue(throwError(() => ({ error: { message: 'Name taken.' } })));
    const fixture = TestBed.createComponent(AttributeForm);
    fixture.componentInstance.open({ mode: 'create' });
    fixture.detectChanges();
    fixture.componentInstance['form'].patchValue({ name: 'Dup', dataType: 'text' });
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(fixture.componentInstance['errorMessage']()).toBe('Name taken.');
  });
});
