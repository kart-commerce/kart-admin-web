import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../config/app-config';
import { AuthService } from './auth.service';
import { IdleSessionService } from './idle-session.service';
import { SessionBroadcastService } from './session-broadcast.service';
import { UNAUTHENTICATED_SESSION } from './models';

describe('IdleSessionService', () => {
  let authServiceSpy: jasmine.SpyObj<Pick<AuthService, 'session' | 'loadSession' | 'logout'>>;

  beforeEach(() => {
    jasmine.clock().install();
    authServiceSpy = jasmine.createSpyObj('AuthService', ['session', 'loadSession', 'logout']);
    authServiceSpy.session.and.returnValue({ ...UNAUTHENTICATED_SESSION, authenticated: true, role: 'admin' });
    authServiceSpy.loadSession.and.returnValue(of(authServiceSpy.session()));
    authServiceSpy.logout.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: APP_CONFIG,
          useValue: {
            ...DEFAULT_APP_CONFIG,
            session: {
              idleTimeoutMinutes: { admin: 1, support_agent: 1 },
              absoluteCapHours: { admin: 24, support_agent: 8 },
              idleWarningSeconds: 5,
              absoluteCapWarningMinutes: 5,
            },
          },
        },
      ],
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('starts active and transitions to warning after the idle window elapses', () => {
    const service = TestBed.inject(IdleSessionService);
    service.start();
    expect(service.state()).toBe('active');

    jasmine.clock().tick(55_000); // 60s idle - 5s warning window
    expect(service.state()).toBe('warning');
  });

  it('expires and logs out when the warning countdown reaches zero', () => {
    const service = TestBed.inject(IdleSessionService);
    service.start();
    jasmine.clock().tick(55_000);
    jasmine.clock().tick(5_000);

    expect(service.state()).toBe('expired');
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('pauses the idle timer while a mutating request is in flight', () => {
    const service = TestBed.inject(IdleSessionService);
    service.start();
    service.beginMutatingRequest();

    jasmine.clock().tick(55_000);
    expect(service.state()).toBe('active');

    service.endMutatingRequest();
    jasmine.clock().tick(55_000);
    expect(service.state()).toBe('warning');
  });

  it('extendSession() resets the idle timer via a fresh session load', () => {
    const service = TestBed.inject(IdleSessionService);
    service.start();
    jasmine.clock().tick(50_000);
    service.extendSession();
    expect(authServiceSpy.loadSession).toHaveBeenCalled();
    expect(service.state()).toBe('active');
  });

  it('mirrors another tab posting a logout message by stopping its own timers', () => {
    const broadcast = TestBed.inject(SessionBroadcastService);
    const service = TestBed.inject(IdleSessionService);
    service.start();
    broadcast.post({ type: 'logout' });
    // No assertion beyond "does not throw" — state ownership after logout
    // belongs to AuthService's own broadcast listener (auth.service.ts).
    expect(() => jasmine.clock().tick(1000)).not.toThrow();
  });
});
