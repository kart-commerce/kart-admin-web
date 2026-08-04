import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GrantService } from '../../../../core/auth/grant.service';
import { UserLockUnlockService } from '../data/user-lock-unlock.service';
import { UserLockUnlock } from './user-lock-unlock';

describe('UserLockUnlock', () => {
  let service: jasmine.SpyObj<UserLockUnlockService>;

  beforeEach(() => {
    service = jasmine.createSpyObj('UserLockUnlockService', ['getUserProfile', 'lockUser', 'unlockUser']);
    TestBed.configureTestingModule({
      imports: [UserLockUnlock],
      providers: [
        { provide: UserLockUnlockService, useValue: service },
        { provide: GrantService, useValue: { has: () => true } },
      ],
    });
  });

  it('locks an account after confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    service.lockUser.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(UserLockUnlock);
    fixture.detectChanges();
    fixture.componentInstance['userIdInput'] = 'user-1';
    fixture.componentInstance['reasonInput'] = 'Fraud review';

    fixture.componentInstance.lock();

    expect(service.lockUser).toHaveBeenCalledWith('user-1', 'Fraud review');
    expect(fixture.componentInstance['actionSuccess']()).toBe('Account locked.');
  });

  it('does not lock without confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const fixture = TestBed.createComponent(UserLockUnlock);
    fixture.detectChanges();
    fixture.componentInstance['userIdInput'] = 'user-1';
    fixture.componentInstance.lock();
    expect(service.lockUser).not.toHaveBeenCalled();
  });

  it('unlocks an account without requiring confirmation', () => {
    service.unlockUser.and.returnValue(of(undefined));
    const fixture = TestBed.createComponent(UserLockUnlock);
    fixture.detectChanges();
    fixture.componentInstance['userIdInput'] = 'user-1';

    fixture.componentInstance.unlock();

    expect(service.unlockUser).toHaveBeenCalledWith('user-1');
    expect(fixture.componentInstance['actionSuccess']()).toBe('Account unlocked.');
  });

  it('surfaces an error if the lock action fails', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    service.lockUser.and.returnValue(throwError(() => ({ error: { message: 'Not found' } })));
    const fixture = TestBed.createComponent(UserLockUnlock);
    fixture.detectChanges();
    fixture.componentInstance['userIdInput'] = 'missing';
    fixture.componentInstance.lock();
    expect(fixture.componentInstance['actionError']()).toBe('Not found');
  });
});
