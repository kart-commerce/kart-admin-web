import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, effect, inject } from '@angular/core';

import { AuthService } from './auth.service';
import { IdleSessionService } from './idle-session.service';
import { RefreshCoordinatorService } from './refresh-coordinator.service';

/**
 * Refreshes the access token shortly *before* it expires, instead of relying solely on a
 * reactive 401 (AUTH-3 reliability hardening). Purely reactive refresh has a structural weakness
 * at scale: it only ever fires once a request has already failed, and any page that fires more
 * than one request around the exact expiry moment produces a burst of simultaneous 401s — the
 * exact scenario `RefreshCoordinatorService` and the BFF's distributed lock (`routes.ts`) exist
 * to make *safe*, but which is far better avoided than merely survived. Refreshing proactively
 * means the overwhelmingly common case is one quiet refresh per token lifetime with nothing ever
 * hitting a 401 at all; the reactive interceptor remains as the fallback for whatever this
 * misses (a tab waking from sleep past its scheduled time, clock skew, this call itself failing).
 *
 * Gated on `IdleSessionService.state() === 'active'` so this still honors security.md §2.2's
 * "silent refresh only while the tab is active/interacted-with" rule (the same rule
 * `auth.interceptor.ts` satisfies for the reactive path): a tab sitting idle/backgrounded is not
 * kept silently alive by this timer — once idle, `IdleSessionService` owns that session's fate
 * (warning → forced logout) same as before. A timer that fires while idle simply no-ops and
 * lets the reactive path or idle timeout handle whatever happens next.
 */
@Injectable({ providedIn: 'root' })
export class AccessTokenRefreshSchedulerService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly refreshCoordinator = inject(RefreshCoordinatorService);
  private readonly idleSession = inject(IdleSessionService);
  private readonly platformId = inject(PLATFORM_ID);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private scheduledForExpiresAt: string | null = null;

  constructor() {
    effect(() => {
      const expiresAt = this.authService.session().accessTokenExpiresAt;
      if (expiresAt !== this.scheduledForExpiresAt) {
        this.schedule(expiresAt);
      }
    });
  }

  private schedule(expiresAt: string | null): void {
    this.clear();
    this.scheduledForExpiresAt = expiresAt;

    if (!isPlatformBrowser(this.platformId) || !expiresAt) {
      return;
    }

    const lifetimeMs = new Date(expiresAt).getTime() - Date.now();
    if (lifetimeMs <= 0) {
      // Already expired/expiring (e.g. this tab was asleep) — nothing to schedule ahead of;
      // the reactive interceptor covers this on the next request.
      return;
    }

    // Refresh a bit before expiry: 20% of the remaining lifetime, capped at 60s so a long-lived
    // token doesn't wait an excessive margin, and floored implicitly by lifetimeMs itself so a
    // very short-lived token still schedules something (never negative).
    const bufferMs = Math.min(60_000, lifetimeMs * 0.2);
    const fireInMs = Math.max(lifetimeMs - bufferMs, 0);
    this.timer = setTimeout(() => this.refreshProactively(), fireInMs);
  }

  private refreshProactively(): void {
    if (this.idleSession.state() !== 'active') {
      // Tab isn't actively in use — don't silently extend it; let the idle-timeout flow (or a
      // future genuine request's reactive 401) decide this session's fate instead.
      return;
    }
    this.refreshCoordinator.refresh().subscribe({
      // Swallow failures here deliberately — this is a best-effort head start, not the source of
      // truth. A failed proactive refresh leaves the existing token in place; the reactive 401
      // interceptor (backed by the same coordinator and the BFF's distributed lock) remains the
      // authoritative fallback the moment a real request needs it.
      error: () => undefined,
    });
  }

  private clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = null;
  }

  ngOnDestroy(): void {
    this.clear();
  }
}
