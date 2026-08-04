import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { MfaVerifyRequest, NativeLoginRequest, NativeLoginResult, SessionInfo, UNAUTHENTICATED_SESSION } from './models';
import { SessionBroadcastService } from './session-broadcast.service';

/**
 * Client-side face of the BFF session-broker (AUTH-1/AUTH-2, security.md
 * §1). Every call goes to a same-origin `/api/bff/*` route — never to
 * kart-api-gateway/kart-identity-service directly — because the
 * access/refresh token pair lives only in the server-side session store
 * (see `server/bff/`).
 *
 * Two distinct login flows land here (requirement-spec.md §5):
 *  - `Admin`: enterprise SSO federation (SAML/OIDC) — `ssoLoginUrl()`
 *    redirects the browser to the BFF, which redirects to the IdP; the IdP
 *    ultimately posts/redirects back to a BFF callback route that
 *    establishes the session and redirects into the app. This service never
 *    talks to the IdP directly.
 *  - `Support Agent`: native email/password login (`login()` below),
 *    followed by a mandatory MFA step (`verifyMfa()`) —
 *    kart-identity-service requires MFA for both Admin and Support Agent.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly broadcast = inject(SessionBroadcastService);

  /** Current session state; starts unauthenticated until the first `loadSession()` resolves. */
  readonly session = signal<SessionInfo>(UNAUTHENTICATED_SESSION);

  constructor() {
    this.broadcast.messages$.subscribe((message) => {
      if (message.type === 'logout') {
        this.session.set(UNAUTHENTICATED_SESSION);
      } else if (message.type === 'login') {
        this.loadSession().subscribe();
      }
    });
  }

  loadSession(): Observable<SessionInfo> {
    return this.http
      .get<SessionInfo>('/api/bff/session')
      .pipe(tap((session) => this.session.set(session)));
  }

  /** Support Agent native login, step 1 (AUTH-2) — may resolve to an MFA challenge instead of an authenticated session. */
  login(request: NativeLoginRequest): Observable<NativeLoginResult> {
    return this.http
      .post<NativeLoginResult>('/api/bff/auth/native/login', request)
      .pipe(tap((result) => this.applyLoginResult(result)));
  }

  /** Support Agent native login, step 2 — completes the MFA challenge from `login()`. */
  verifyMfa(request: MfaVerifyRequest): Observable<SessionInfo> {
    return this.http.post<SessionInfo>('/api/bff/auth/native/mfa/verify', request).pipe(
      tap((session) => {
        this.session.set(session);
        this.broadcast.post({ type: 'login' });
      }),
    );
  }

  /** Same-origin redirect target for the Admin SSO login button (AUTH-1); the BFF proxies to the enterprise IdP. */
  ssoLoginUrl(): string {
    return '/api/bff/auth/sso/login';
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/bff/auth/logout', {}).pipe(
      tap(() => {
        this.session.set(UNAUTHENTICATED_SESSION);
        this.broadcast.post({ type: 'logout' });
      }),
    );
  }

  private applyLoginResult(result: NativeLoginResult): void {
    if (result.status === 'authenticated') {
      this.session.set(result.session);
      this.broadcast.post({ type: 'login' });
    }
  }
}
