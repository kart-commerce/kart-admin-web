import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';

import { AuthService } from './auth.service';
import { GrantCategory, Role } from './models';
import { GrantService } from './grant.service';

/** Guards a route behind an authenticated session, redirecting to login otherwise (AUTH-1/AUTH-2). */
export const authenticatedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService
    .loadSession()
    .pipe(map((session) => (session.authenticated ? true : router.parseUrl('/login'))));
};

/**
 * Route-level layer of AUTH-5's layered gating (design-decisions.md
 * "Category-Grant UI Gating"). Requires the session already be authenticated
 * (compose with `authenticatedGuard` first) — redirects to a dedicated
 * Access Denied route rather than silently redirecting to the dashboard or
 * rendering a screen full of individually-failing API calls
 * (edge-cases.md "Direct-URL Navigation to a Category-Gated Route the
 * Session's Grant Doesn't Cover").
 */
export function roleGuard(role: Role): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    return authService.session().role === role ? true : router.parseUrl('/access-denied');
  };
}

/** Same as `roleGuard`, additionally requiring a live category grant (AUTH-5). */
export function categoryGrantGuard(category: GrantCategory): CanActivateFn {
  return () => {
    const grantService = inject(GrantService);
    const router = inject(Router);
    return grantService.has(category) ? true : router.parseUrl('/access-denied');
  };
}
