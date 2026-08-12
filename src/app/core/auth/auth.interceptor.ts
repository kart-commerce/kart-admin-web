import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { RefreshCoordinatorService } from './refresh-coordinator.service';

/**
 * Silent-refresh interceptor (AUTH-3): on a single 401 from a BFF-proxied
 * call, attempt one `/api/bff/auth/refresh` and retry the original request
 * once. The auth routes themselves are excluded to avoid a refresh loop (a
 * 401 from `/api/bff/auth/native/login` means bad credentials, not an
 * expired session).
 *
 * This already satisfies security.md §2.2's "silent refresh only while the
 * tab is active/interacted-with" rule without a separate proactive-refresh
 * timer: a request only happens as a result of the user (or a
 * user-triggered load) doing something in this tab, so a backgrounded/idle
 * tab making no requests never triggers a refresh here either.
 *
 * Refresh calls go through `RefreshCoordinatorService` rather than a bare
 * `http.post` so that several requests 401ing around the same moment (a
 * dashboard firing multiple widget calls, say) share one refresh instead of
 * each racing to rotate the same single-use refresh token — see that
 * service's doc comment for why the naive per-request version logs the user
 * out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const refreshCoordinator = inject(RefreshCoordinatorService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isAuthRoute = req.url.startsWith('/api/bff/auth/');
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthRoute) {
        return refreshCoordinator.refresh().pipe(
          switchMap(() => next(req)),
          catchError(() => throwError(() => error)),
        );
      }
      return throwError(() => error);
    }),
  );
};
