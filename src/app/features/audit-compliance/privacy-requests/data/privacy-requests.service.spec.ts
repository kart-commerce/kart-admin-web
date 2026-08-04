import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { PrivacyRequestsService } from './privacy-requests.service';

describe('PrivacyRequestsService', () => {
  it('list() delegates to listPrivacyRequests', () => {
    const adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['listPrivacyRequests']);
    adminApi.listPrivacyRequests.and.returnValue(of({} as any));
    TestBed.configureTestingModule({ providers: [{ provide: AdminApiService, useValue: adminApi }] });

    TestBed.inject(PrivacyRequestsService).list('pending').subscribe();
    expect(adminApi.listPrivacyRequests).toHaveBeenCalledWith({ status: 'pending' });
  });
});
