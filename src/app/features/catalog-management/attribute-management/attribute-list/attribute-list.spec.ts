import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AttributeManagementService } from '../data/attribute-management.service';
import { AttributeList } from './attribute-list';

describe('AttributeList', () => {
  let attributeManagementService: jasmine.SpyObj<AttributeManagementService>;

  const attributes = [
    { attributeId: 'attr-1', name: 'Color', categoryId: null, dataType: 'select' as const, values: [{ valueId: 'v1', value: 'Red', displayOrder: 0 }], status: 'active' as const },
  ];

  beforeEach(() => {
    attributeManagementService = jasmine.createSpyObj('AttributeManagementService', ['listAttributes', 'deprecateAttribute']);
    attributeManagementService.listAttributes.and.returnValue(of(attributes));
    TestBed.configureTestingModule({
      imports: [AttributeList],
      providers: [{ provide: AttributeManagementService, useValue: attributeManagementService }],
    });
  });

  it('loads and renders attributes', () => {
    const fixture = TestBed.createComponent(AttributeList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Color');
    expect(fixture.nativeElement.textContent).toContain('Red');
  });

  it('shows an empty state with no results', () => {
    attributeManagementService.listAttributes.and.returnValue(of([]));
    const fixture = TestBed.createComponent(AttributeList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No attributes yet');
  });

  it('shows an error state on failure', () => {
    attributeManagementService.listAttributes.and.returnValue(throwError(() => ({ error: { message: 'Down' } })));
    const fixture = TestBed.createComponent(AttributeList);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Down');
  });

  it('deprecates an attribute after confirmation and reloads', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    attributeManagementService.deprecateAttribute.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(AttributeList);
    fixture.detectChanges();

    fixture.componentInstance.deprecate(attributes[0]);

    expect(attributeManagementService.deprecateAttribute).toHaveBeenCalledWith('attr-1');
    expect(attributeManagementService.listAttributes).toHaveBeenCalledTimes(2);
  });

  it('does not deprecate without confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const fixture = TestBed.createComponent(AttributeList);
    fixture.detectChanges();

    fixture.componentInstance.deprecate(attributes[0]);

    expect(attributeManagementService.deprecateAttribute).not.toHaveBeenCalled();
  });
});
