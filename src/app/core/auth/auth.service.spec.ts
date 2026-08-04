import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { UNAUTHENTICATED_SESSION } from './models';
import { SessionBroadcastService } from './session-broadcast.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let broadcast: jasmine.SpyObj<SessionBroadcastService>;

  beforeEach(() => {
    broadcast = jasmine.createSpyObj<SessionBroadcastService>('SessionBroadcastService', ['post'], {
      messages$: { subscribe: () => ({ unsubscribe: () => undefined }) } as never,
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SessionBroadcastService, useValue: broadcast },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts unauthenticated', () => {
    expect(service.session()).toEqual(UNAUTHENTICATED_SESSION);
  });

  it('loadSession() updates the session signal from the BFF', () => {
    service.loadSession().subscribe();
    const req = httpMock.expectOne('/api/bff/session');
    expect(req.request.method).toBe('GET');
    req.flush({ authenticated: true, role: 'admin', principalId: 'p1', grants: [], loginAt: null, absoluteCapAt: null });

    expect(service.session().authenticated).toBeTrue();
    expect(service.session().role).toBe('admin');
  });

  it('login() establishes a session and broadcasts login when MFA is not pending', () => {
    service.login({ email: 'a@b.com', password: 'secret' }).subscribe();
    const req = httpMock.expectOne('/api/bff/auth/native/login');
    expect(req.request.method).toBe('POST');
    req.flush({
      status: 'authenticated',
      session: {
        authenticated: true,
        role: 'support_agent',
        principalId: 'p2',
        grants: [],
        loginAt: new Date().toISOString(),
        absoluteCapAt: new Date().toISOString(),
      },
    });

    expect(service.session().role).toBe('support_agent');
    expect(broadcast.post).toHaveBeenCalledWith({ type: 'login' });
  });

  it('login() surfaces an MFA challenge without establishing a session', () => {
    let result: { status: string } | undefined;
    service.login({ email: 'a@b.com', password: 'secret' }).subscribe((r) => (result = r));
    httpMock
      .expectOne('/api/bff/auth/native/login')
      .flush({ status: 'mfa-required', challenge: { challengeId: 'c1', expiresInSeconds: 300 } });

    expect(result?.status).toBe('mfa-required');
    expect(service.session().authenticated).toBeFalse();
    expect(broadcast.post).not.toHaveBeenCalledWith({ type: 'login' });
  });

  it('verifyMfa() establishes a session and broadcasts login', () => {
    service.verifyMfa({ challengeId: 'c1', totpCode: '123456' }).subscribe();
    httpMock.expectOne('/api/bff/auth/native/mfa/verify').flush({
      authenticated: true,
      role: 'support_agent',
      principalId: 'p2',
      grants: [],
      loginAt: new Date().toISOString(),
      absoluteCapAt: new Date().toISOString(),
    });

    expect(service.session().role).toBe('support_agent');
    expect(broadcast.post).toHaveBeenCalledWith({ type: 'login' });
  });

  it('logout() clears the session and broadcasts logout', () => {
    service.logout().subscribe();
    httpMock.expectOne('/api/bff/auth/logout').flush(null);

    expect(service.session()).toEqual(UNAUTHENTICATED_SESSION);
    expect(broadcast.post).toHaveBeenCalledWith({ type: 'logout' });
  });

  it('ssoLoginUrl() points at the BFF SSO redirect route', () => {
    expect(service.ssoLoginUrl()).toBe('/api/bff/auth/sso/login');
  });
});
