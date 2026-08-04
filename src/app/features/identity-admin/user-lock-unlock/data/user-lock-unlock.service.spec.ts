import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminApiService } from '../../../../core/http/generated/admin/v1';
import { UserReadApiService } from '../../../../core/http/generated/user/v1';
import { UserLockUnlockService } from './user-lock-unlock.service';

describe('UserLockUnlockService', () => {
  let service: UserLockUnlockService;
  let userReadApi: jasmine.SpyObj<UserReadApiService>;
  let adminApi: jasmine.SpyObj<AdminApiService>;

  beforeEach(() => {
    userReadApi = jasmine.createSpyObj<UserReadApiService>('UserReadApiService', ['getUserProfile']);
    adminApi = jasmine.createSpyObj<AdminApiService>('AdminApiService', ['lockUser', 'unlockUser']);
    TestBed.configureTestingModule({
      providers: [
        { provide: UserReadApiService, useValue: userReadApi },
        { provide: AdminApiService, useValue: adminApi },
      ],
    });
    service = TestBed.inject(UserLockUnlockService);
  });

  it('lockUser() calls the admin proxy with an optional reason', () => {
    adminApi.lockUser.and.returnValue(of({} as any));
    service.lockUser('user-1', 'Fraud review').subscribe();
    expect(adminApi.lockUser).toHaveBeenCalledWith('user-1', { reason: 'Fraud review' }, jasmine.any(String));
  });

  it('unlockUser() calls the admin proxy', () => {
    adminApi.unlockUser.and.returnValue(of({} as any));
    service.unlockUser('user-1').subscribe();
    expect(adminApi.unlockUser).toHaveBeenCalledWith('user-1', jasmine.any(String));
  });
});
