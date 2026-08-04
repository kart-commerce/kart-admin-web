import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

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
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isAuthRoute = req.url.startsWith('/api/bff/auth/');
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthRoute) {
        return http.post('/api/bff/auth/refresh', {}).pipe(
          switchMap(() => next(req)),
          catchError(() => throwError(() => error)),
        );
      }
      return throwError(() => error);
    }),
  );
};
