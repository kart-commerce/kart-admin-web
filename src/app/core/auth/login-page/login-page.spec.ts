import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../auth.service';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  it('renders both the SSO and native login panels', () => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: { ssoLoginUrl: () => '/api/bff/auth/sso/login' } }],
    });
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('kart-sso-login')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('kart-native-login')).toBeTruthy();
  });
});
