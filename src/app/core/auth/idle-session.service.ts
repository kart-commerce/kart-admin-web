import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';

import { APP_CONFIG } from '../config/app-config';
import { AuthService } from './auth.service';
import { SessionBroadcastService } from './session-broadcast.service';

export type IdleState = 'active' | 'warning' | 'expired';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;
const ACTIVITY_THROTTLE_MS = 5_000;

/**
 * AUTH-3's idle-session client state machine (`Active → Warning →
 * Expired`), the shared foundation every other feature depends on for
 * session context (tickets.md's Notes for Sprint Planner Agent). Implements:
 *  - security.md §2.2's role-split idle timeout (Admin 15 min / Support
 *    Agent 20 min) and 60-second warning popup.
 *  - design-decisions.md's "in-flight mutating request counts as activity"
 *    rule (edge-cases.md "Idle-Timeout Warning Countdown Racing an
 *    In-Flight Refund-Approval Submit") via `beginMutatingRequest`/
 *    `endMutatingRequest`, driven by `mutating-request.interceptor.ts`.
 *  - `BroadcastChannel('kart-admin-session')` multi-tab mirroring (any
 *    tab's activity resets every open tab's timer; a warning/logout in any
 *    tab is mirrored to all).
 */
@Injectable({ providedIn: 'root' })
export class IdleSessionService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly broadcast = inject(SessionBroadcastService);
  private readonly appConfig = inject(APP_CONFIG);
  private readonly platformId = inject(PLATFORM_ID);

  readonly state = signal<IdleState>('active');
  readonly warningSecondsRemaining = signal(0);

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private warningInterval: ReturnType<typeof setInterval> | null = null;
  private inFlightMutatingRequests = 0;
  private started = false;
  private lastActivityAt = 0;
  private readonly boundOnActivity = () => this.onActivityEvent();
  private readonly boundOnVisibility = () => this.onActivityEvent();
  private broadcastSubscription: { unsubscribe(): void } | null = null;

  constructor() {
    this.broadcastSubscription = this.broadcast.messages$.subscribe((message) => {
      if (message.type === 'activity') {
        this.recordActivity({ broadcastToOtherTabs: false });
      } else if (message.type === 'warning' && this.state() === 'active') {
        this.beginWarning({ broadcastToOtherTabs: false });
      } else if (message.type === 'logout') {
        this.stop();
      }
    });
  }

  start(): void {
    if (this.started || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.started = true;
    this.state.set('active');
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, this.boundOnActivity, { passive: true }));
    document.addEventListener('visibilitychange', this.boundOnVisibility);
    this.resetIdleTimer();
  }

  stop(): void {
    this.started = false;
    this.clearTimers();
    ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, this.boundOnActivity));
    document.removeEventListener('visibilitychange', this.boundOnVisibility);
  }

  /** Called by every non-idempotent HTTP request in flight (mutating-request.interceptor.ts). */
  beginMutatingRequest(): void {
    this.inFlightMutatingRequests += 1;
    this.pauseIdleTimer();
  }

  endMutatingRequest(): void {
    this.inFlightMutatingRequests = Math.max(0, this.inFlightMutatingRequests - 1);
    if (this.inFlightMutatingRequests === 0) {
      this.recordActivity();
    }
  }

  /** "Stay signed in" action on the warning modal. */
  extendSession(): void {
    this.authService.loadSession().subscribe({
      next: () => this.recordActivity(),
      error: () => this.expire(),
    });
  }

  private onActivityEvent(): void {
    const now = Date.now();
    if (now - this.lastActivityAt < ACTIVITY_THROTTLE_MS) {
      return;
    }
    this.lastActivityAt = now;
    this.recordActivity();
  }

  private recordActivity(options: { broadcastToOtherTabs?: boolean } = {}): void {
    if (this.state() === 'expired') {
      return;
    }
    this.state.set('active');
    this.resetIdleTimer();
    if (options.broadcastToOtherTabs !== false) {
      this.broadcast.post({ type: 'activity' });
    }
  }

  private resetIdleTimer(): void {
    this.clearTimers();
    if (!this.started) {
      return;
    }
    const idleMs = this.idleTimeoutMs() - this.appConfig.session.idleWarningSeconds * 1000;
    this.idleTimer = setTimeout(() => this.beginWarning(), Math.max(idleMs, 0));
  }

  private beginWarning(options: { broadcastToOtherTabs?: boolean } = {}): void {
    if (this.inFlightMutatingRequests > 0) {
      // An in-flight write counts as activity — defer the warning rather than
      // interrupting a submit that's still resolving (edge-cases.md).
      this.idleTimer = setTimeout(() => this.beginWarning(options), 5_000);
      return;
    }

    this.state.set('warning');
    if (options.broadcastToOtherTabs !== false) {
      this.broadcast.post({ type: 'warning' });
    }

    let remaining = this.appConfig.session.idleWarningSeconds;
    this.warningSecondsRemaining.set(remaining);
    this.warningInterval = setInterval(() => {
      remaining -= 1;
      this.warningSecondsRemaining.set(remaining);
      if (remaining <= 0) {
        this.expire();
      }
    }, 1_000);
  }

  private expire(): void {
    this.clearTimers();
    this.state.set('expired');
    this.authService.logout().subscribe();
  }

  private pauseIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private clearTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (this.warningInterval) {
      clearInterval(this.warningInterval);
    }
    this.idleTimer = null;
    this.warningInterval = null;
  }

  private idleTimeoutMs(): number {
    const role = this.authService.session().role;
    const minutes =
      role === 'admin'
        ? this.appConfig.session.idleTimeoutMinutes.admin
        : this.appConfig.session.idleTimeoutMinutes.support_agent;
    return minutes * 60_000;
  }

  ngOnDestroy(): void {
    this.stop();
    this.broadcastSubscription?.unsubscribe();
  }
}
