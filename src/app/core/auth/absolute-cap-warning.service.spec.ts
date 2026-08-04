import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../config/app-config';
import { AbsoluteCapWarningService } from './absolute-cap-warning.service';
import { AuthService } from './auth.service';
import { UNAUTHENTICATED_SESSION } from './models';

describe('AbsoluteCapWarningService', () => {
  let sessionSignal: ReturnType<typeof signal<ReturnType<typeof mkSession>>>;
  let authServiceSpy: jasmine.SpyObj<Pick<AuthService, 'session' | 'logout'>>;

  function mkSession(absoluteCapAt: string | null) {
    return { ...UNAUTHENTICATED_SESSION, authenticated: true, role: 'admin' as const, absoluteCapAt };
  }

  beforeEach(() => {
    jasmine.clock().install();
    sessionSignal = signal(mkSession(null));
    authServiceSpy = jasmine.createSpyObj('AuthService', ['session', 'logout']);
    authServiceSpy.session.and.callFake((() => sessionSignal()) as unknown as AuthService['session']);
    authServiceSpy.logout.and.returnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        {
          provide: APP_CONFIG,
          useValue: { ...DEFAULT_APP_CONFIG, session: { ...DEFAULT_APP_CONFIG.session, absoluteCapWarningMinutes: 5 } },
        },
      ],
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('shows the warning 5 minutes before the absolute cap', () => {
    const capAt = new Date(Date.now() + 6 * 60_000).toISOString();
    const service = TestBed.inject(AbsoluteCapWarningService);
    sessionSignal.set(mkSession(capAt));
    TestBed.tick();

    expect(service.warningVisible()).toBeFalse();
    jasmine.clock().tick(60_000 + 1000); // past the 5-minute mark
    expect(service.warningVisible()).toBeTrue();
  });

  it('force-logs-out at the absolute cap', () => {
    const capAt = new Date(Date.now() + 6 * 60_000).toISOString();
    TestBed.inject(AbsoluteCapWarningService);
    sessionSignal.set(mkSession(capAt));
    TestBed.tick();

    jasmine.clock().tick(6 * 60_000 + 1000);
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('acknowledge() hides the warning without extending anything', () => {
    const capAt = new Date(Date.now() + 60_000).toISOString();
    const service = TestBed.inject(AbsoluteCapWarningService);
    sessionSignal.set(mkSession(capAt));
    TestBed.tick();
    expect(service.warningVisible()).toBeTrue();

    service.acknowledge();
    expect(service.warningVisible()).toBeFalse();
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });
});
