import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { PermissionGrantManagementService } from './permission-grant-management.service';

describe('PermissionGrantManagementService', () => {
  let service: PermissionGrantManagementService;
  let adminApi: jasmine.SpyObj<AdminApiService>;

  beforeEach(() => {
    adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', [
      'listPermissionGrants',
      'issuePermissionGrant',
      'revokePermissionGrant',
    ]);
    TestBed.configureTestingModule({ providers: [{ provide: AdminApiService, useValue: adminApi }] });
    service = TestBed.inject(PermissionGrantManagementService);
  });

  it('list() delegates to the admin API', () => {
    adminApi.listPermissionGrants.and.returnValue(of({} as any));
    service.list({ principalId: 'p1' }).subscribe();
    expect(adminApi.listPermissionGrants).toHaveBeenCalledWith({ principalId: 'p1' });
  });

  it('issue() calls issuePermissionGrant with a generated idempotency key', () => {
    adminApi.issuePermissionGrant.and.returnValue(of({} as any));
    service.issue({ principalId: 'p1', category: 'catalog-management' }).subscribe();
    expect(adminApi.issuePermissionGrant).toHaveBeenCalledWith({ principalId: 'p1', category: 'catalog-management' }, jasmine.any(String));
  });

  it('revoke() forwards the If-Match version', () => {
    adminApi.revokePermissionGrant.and.returnValue(of({} as any));
    service.revoke('grant-1', 2).subscribe();
    expect(adminApi.revokePermissionGrant).toHaveBeenCalledWith('grant-1', 2, jasmine.any(String));
  });
});
