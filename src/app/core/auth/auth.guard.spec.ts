import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { authenticatedGuard, categoryGrantGuard, roleGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { GrantService } from './grant.service';
import { UNAUTHENTICATED_SESSION } from './models';

describe('auth guards', () => {
  it('authenticatedGuard allows an authenticated session', (done) => {
    const authService = { loadSession: () => of({ ...UNAUTHENTICATED_SESSION, authenticated: true }) };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });

    TestBed.runInInjectionContext(() => {
      const result = authenticatedGuard({} as never, {} as never);
      (result as ReturnType<typeof of>).subscribe((value: unknown) => {
        expect(value).toBeTrue();
        done();
      });
    });
  });

  it('authenticatedGuard redirects to /login when unauthenticated', (done) => {
    const authService = { loadSession: () => of(UNAUTHENTICATED_SESSION) };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });

    TestBed.runInInjectionContext(() => {
      const result = authenticatedGuard({} as never, {} as never);
      (result as ReturnType<typeof of>).subscribe((value: unknown) => {
        expect(String(value)).toContain('/login');
        done();
      });
    });
  });

  it('roleGuard allows a matching role and redirects otherwise', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { session: () => ({ ...UNAUTHENTICATED_SESSION, role: 'admin' }) } },
      ],
    });

    TestBed.runInInjectionContext(() => {
      expect(roleGuard('admin')({} as never, {} as never)).toBeTrue();
      const denied = roleGuard('support_agent')({} as never, {} as never);
      expect(String(denied)).toContain('/access-denied');
    });
  });

  it('categoryGrantGuard allows a held grant and redirects otherwise', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: GrantService, useValue: { has: (c: string) => c === 'catalog-management' } }],
    });

    TestBed.runInInjectionContext(() => {
      expect(categoryGrantGuard('catalog-management')({} as never, {} as never)).toBeTrue();
      const denied = categoryGrantGuard('user-suspension')({} as never, {} as never);
      expect(String(denied)).toContain('/access-denied');
    });
  });
});
