import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { UserReadApiService } from '../../../../core/http/generated/user/v1';
import { CustomerAccountAssistanceService } from './customer-account-assistance.service';

describe('CustomerAccountAssistanceService', () => {
  it('getUserProfile() reads from user-service directly', () => {
    const userReadApi = jasmine.createSpyObj<UserReadApiService>('UserReadApiService', ['getUserProfile']);
    userReadApi.getUserProfile.and.returnValue(of({} as any));
    TestBed.configureTestingModule({ providers: [{ provide: UserReadApiService, useValue: userReadApi }] });

    TestBed.inject(CustomerAccountAssistanceService).getUserProfile('user-1').subscribe();
    expect(userReadApi.getUserProfile).toHaveBeenCalledWith('user-1');
  });
});
