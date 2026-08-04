import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { GrantService } from './grant.service';
import { UNAUTHENTICATED_SESSION } from './models';

describe('GrantService', () => {
  function withSession(session: Partial<ReturnType<AuthService['session']>>) {
    TestBed.resetTestingModule();
    const authService = { session: () => ({ ...UNAUTHENTICATED_SESSION, ...session }) } as AuthService;
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authService }] });
    return TestBed.inject(GrantService);
  }

  it('has() reflects the current session grants', () => {
    const service = withSession({ authenticated: true, role: 'admin', grants: ['catalog-management'] });
    expect(service.has('catalog-management')).toBeTrue();
    expect(service.has('user-suspension')).toBeFalse();
  });

  it('isAdmin/isSupportAgent reflect the session role', () => {
    expect(withSession({ role: 'admin' }).isAdmin()).toBeTrue();
    expect(withSession({ role: 'support_agent' }).isSupportAgent()).toBeTrue();
    expect(withSession({ role: 'admin' }).isSupportAgent()).toBeFalse();
  });
});
