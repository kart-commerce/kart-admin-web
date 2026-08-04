import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AuthService } from '../auth.service';
import { NativeLogin } from './native-login';
import { UNAUTHENTICATED_SESSION } from '../models';

describe('NativeLogin', () => {
  let authServiceSpy: jasmine.SpyObj<Pick<AuthService, 'login' | 'verifyMfa'>>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'verifyMfa']);
    TestBed.configureTestingModule({
      imports: [NativeLogin],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceSpy }],
    });
  });

  it('does not submit an invalid credentials form', () => {
    const fixture = TestBed.createComponent(NativeLogin);
    fixture.detectChanges();
    fixture.componentInstance.submitCredentials();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
    expect(fixture.componentInstance['credentialsForm'].touched).toBeTrue();
  });

  it('logs in and navigates home when MFA is not required', () => {
    authServiceSpy.login.and.returnValue(
      of({ status: 'authenticated', session: { ...UNAUTHENTICATED_SESSION, authenticated: true, role: 'support_agent' } }),
    );
    const fixture = TestBed.createComponent(NativeLogin);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');

    fixture.componentInstance['credentialsForm'].setValue({ email: 'agent@kart.example', password: 'secret123' });
    fixture.componentInstance.submitCredentials();

    expect(authServiceSpy.login).toHaveBeenCalledWith({ email: 'agent@kart.example', password: 'secret123' });
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('advances to the MFA step when a challenge is returned', () => {
    authServiceSpy.login.and.returnValue(of({ status: 'mfa-required', challenge: { challengeId: 'c1', expiresInSeconds: 300 } }));
    const fixture = TestBed.createComponent(NativeLogin);
    fixture.detectChanges();

    fixture.componentInstance['credentialsForm'].setValue({ email: 'agent@kart.example', password: 'secret123' });
    fixture.componentInstance.submitCredentials();
    fixture.detectChanges();

    expect(fixture.componentInstance['step']()).toBe('mfa');
    expect(fixture.nativeElement.textContent).toContain('authenticator app');
  });

  it('verifies the MFA code and navigates home', () => {
    authServiceSpy.login.and.returnValue(of({ status: 'mfa-required', challenge: { challengeId: 'c1', expiresInSeconds: 300 } }));
    authServiceSpy.verifyMfa.and.returnValue(of({ ...UNAUTHENTICATED_SESSION, authenticated: true, role: 'support_agent' }));
    const fixture = TestBed.createComponent(NativeLogin);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');

    fixture.componentInstance['credentialsForm'].setValue({ email: 'agent@kart.example', password: 'secret123' });
    fixture.componentInstance.submitCredentials();
    fixture.componentInstance['mfaForm'].setValue({ totpCode: '123456' });
    fixture.componentInstance.submitMfa();

    expect(authServiceSpy.verifyMfa).toHaveBeenCalledWith({ challengeId: 'c1', totpCode: '123456' });
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('surfaces a Problem-shaped error message on credential failure', () => {
    authServiceSpy.login.and.returnValue(
      throwError(() => ({ error: { code: 'invalid_credentials', message: 'Bad email or password.' } })),
    );
    const fixture = TestBed.createComponent(NativeLogin);
    fixture.detectChanges();

    fixture.componentInstance['credentialsForm'].setValue({ email: 'agent@kart.example', password: 'wrong' });
    fixture.componentInstance.submitCredentials();
    fixture.detectChanges();

    expect(fixture.componentInstance['errorMessage']()).toBe('Bad email or password.');
  });
});
