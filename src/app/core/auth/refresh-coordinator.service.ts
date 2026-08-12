import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, finalize, shareReplay, tap } from 'rxjs';

import { AuthService } from './auth.service';
import { SessionInfo } from './models';

/**
 * Single-flight guard around `POST /api/bff/auth/refresh` (AUTH-3). Two independent callers can
 * both want a refresh at once — `auth.interceptor.ts` reacting to a 401, and
 * `AccessTokenRefreshSchedulerService` refreshing proactively ahead of expiry — and it's common
 * for several *requests* in the same tab to 401 at (near) the same moment right after the access
 * token expires (e.g. a dashboard firing several widget calls together). Without coalescing,
 * each would issue its own refresh call. The BFF itself also coalesces server-side (`routes.ts`,
 * both an in-process guard and a cross-instance Redis lock) to stay correct across pods and
 * tabs regardless of what the client does, but closing the race here too avoids redundant round
 * trips in the common single-tab case.
 *
 * `shareReplay(1)` lets every caller that arrives while a refresh is in flight subscribe to the
 * same underlying HTTP call (and replays its outcome, success or error); `finalize` drops the
 * cached observable once that call settles so the *next* trigger starts a fresh refresh rather
 * than replaying a stale one.
 *
 * The resulting `SessionInfo` is also applied to `AuthService.session` here — a refresh rotates
 * `accessTokenExpiresAt` (and, via the BFF, possibly `grants`/`grantsDegraded` if they were
 * re-checked), so every consumer of the session signal (idle timer, absolute-cap warning, grant
 * checks, the proactive-refresh scheduler itself) sees the up-to-date session immediately rather
 * than only after the next explicit `loadSession()`.
 */
@Injectable({ providedIn: 'root' })
export class RefreshCoordinatorService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private inFlight: Observable<SessionInfo> | null = null;

  refresh(): Observable<SessionInfo> {
    if (!this.inFlight) {
      this.inFlight = this.http.post<SessionInfo>('/api/bff/auth/refresh', {}).pipe(
        tap((session) => this.authService.session.set(session)),
        finalize(() => (this.inFlight = null)),
        shareReplay(1),
      );
    }
    return this.inFlight;
  }
}
