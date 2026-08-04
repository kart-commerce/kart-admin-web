import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, effect, inject, signal } from '@angular/core';

import { APP_CONFIG } from '../config/app-config';
import { AuthService } from './auth.service';

/**
 * AUTH-4's absolute-session-cap advance warning (edge-cases.md "Admin's
 * Federated Session Hits Its 24-Hour Absolute Cap Mid-Task With No
 * Warning"). Distinct from `IdleSessionService`: the absolute cap is a hard,
 * non-sliding wall (security.md §2.2 — 24h Admin / 8h Support Agent) with no
 * "Stay signed in" recovery action, only a ~5-minute advance notice so the
 * user can wrap up/save before a forced logout they cannot postpone.
 */
@Injectable({ providedIn: 'root' })
export class AbsoluteCapWarningService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly platformId = inject(PLATFORM_ID);

  readonly warningVisible = signal(false);

  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private scheduledForCapAt: string | null = null;

  constructor() {
    effect(() => {
      const capAt = this.authService.session().absoluteCapAt;
      if (capAt !== this.scheduledForCapAt) {
        this.schedule(capAt);
      }
    });
  }

  /** Acknowledges the warning without extending the session — there is nothing to extend. */
  acknowledge(): void {
    this.warningVisible.set(false);
  }

  private schedule(capAt: string | null): void {
    this.clearTimers();
    this.scheduledForCapAt = capAt;

    if (!isPlatformBrowser(this.platformId) || !capAt) {
      this.warningVisible.set(false);
      return;
    }

    const capTimeMs = new Date(capAt).getTime();
    const warnAtMs = capTimeMs - this.appConfig.session.absoluteCapWarningMinutes * 60_000;
    const nowMs = Date.now();

    if (capTimeMs <= nowMs) {
      this.warningVisible.set(false);
      return;
    }

    if (warnAtMs > nowMs) {
      this.warningTimer = setTimeout(() => this.warningVisible.set(true), warnAtMs - nowMs);
    } else {
      this.warningVisible.set(true);
    }

    this.expiryTimer = setTimeout(() => this.forceLogout(), capTimeMs - nowMs);
  }

  private forceLogout(): void {
    this.warningVisible.set(false);
    this.authService.logout().subscribe();
  }

  private clearTimers(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
    }
    this.warningTimer = null;
    this.expiryTimer = null;
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }
}
