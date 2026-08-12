import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { AttributeReadApiService } from '../../../../core/http/generated/category/v1';
import { AttributeManagementService } from './attribute-management.service';

describe('AttributeManagementService', () => {
  let service: AttributeManagementService;
  let attributeReadApi: jasmine.SpyObj<AttributeReadApiService>;
  let adminApi: jasmine.SpyObj<AdminApiService>;

  beforeEach(() => {
    attributeReadApi = jasmine.createSpyObj<AttributeReadApiService>('AttributeReadApiService', ['listAttributes']);
    adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['createAttribute', 'updateAttribute', 'deprecateAttribute']);
    TestBed.configureTestingModule({
      providers: [
        { provide: AttributeReadApiService, useValue: attributeReadApi },
        { provide: AdminApiService, useValue: adminApi },
      ],
    });
    service = TestBed.inject(AttributeManagementService);
  });

  it('listAttributes() reads via the read API with optional categoryId/includeDeprecated', () => {
    attributeReadApi.listAttributes.and.returnValue(of([]));
    service.listAttributes('cat-1', true).subscribe();
    expect(attributeReadApi.listAttributes).toHaveBeenCalledWith({ categoryId: 'cat-1', includeDeprecated: true });
  });

  it('createAttribute() calls the admin proxy with a generated idempotency key', () => {
    adminApi.createAttribute.and.returnValue(of({} as any));
    service.createAttribute({ name: 'Color', categoryId: null, dataType: 'select', values: [{ value: 'Red', displayOrder: 0 }] }).subscribe();
    expect(adminApi.createAttribute).toHaveBeenCalledWith(
      { name: 'Color', categoryId: null, dataType: 'select', values: [{ value: 'Red', displayOrder: 0 }] },
      jasmine.any(String),
    );
  });

  it('updateAttribute() forwards name/values only (categoryId/dataType are immutable)', () => {
    adminApi.updateAttribute.and.returnValue(of({} as any));
    service.updateAttribute('attr-1', { name: 'Primary Color', categoryId: null, dataType: 'select', values: [] }).subscribe();
    expect(adminApi.updateAttribute).toHaveBeenCalledWith('attr-1', { name: 'Primary Color', values: [] }, jasmine.any(String));
  });

  it('deprecateAttribute() calls the admin proxy', () => {
    adminApi.deprecateAttribute.and.returnValue(of({} as any));
    service.deprecateAttribute('attr-1').subscribe();
    expect(adminApi.deprecateAttribute).toHaveBeenCalledWith('attr-1', jasmine.any(String));
  });
});
