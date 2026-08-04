import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { AuditTrailService } from './audit-trail.service';

describe('AuditTrailService', () => {
  it('list() delegates to listAdminActions', () => {
    const adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['listAdminActions']);
    adminApi.listAdminActions.and.returnValue(of({} as any));
    TestBed.configureTestingModule({ providers: [{ provide: AdminApiService, useValue: adminApi }] });

    TestBed.inject(AuditTrailService).list({ category: 'catalog-management' }).subscribe();
    expect(adminApi.listAdminActions).toHaveBeenCalledWith({ category: 'catalog-management' });
  });
});
