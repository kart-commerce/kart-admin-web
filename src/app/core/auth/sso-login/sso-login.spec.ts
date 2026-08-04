import { TestBed } from '@angular/core/testing';

import { AuthService } from '../auth.service';
import { SsoLogin } from './sso-login';

describe('SsoLogin', () => {
  it('links to the BFF SSO redirect route', () => {
    TestBed.configureTestingModule({
      imports: [SsoLogin],
      providers: [{ provide: AuthService, useValue: { ssoLoginUrl: () => '/api/bff/auth/sso/login' } }],
    });
    const fixture = TestBed.createComponent(SsoLogin);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/api/bff/auth/sso/login');
  });
});
