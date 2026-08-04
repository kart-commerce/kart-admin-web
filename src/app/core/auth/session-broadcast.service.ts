import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * security.md §2.2's `BroadcastChannel('kart-admin-session')` payload,
 * deliberately session-lifecycle-scoped only (design-decisions.md "Multi-Tab
 * Session Sync" — no grant-change propagation, edge-cases.md "Multi-Tab
 * BroadcastChannel Doesn't Propagate a Mid-Session Grant/Role Change"):
 *  - 'activity': any tab's user interaction — resets every open tab's idle timer.
 *  - 'warning': the idle-timeout warning modal was shown in one tab — mirrored to all.
 *  - 'logout': logout (manual or idle-timeout-forced) in one tab — mirrored, instant and total.
 *  - 'login': a fresh session was established in one tab (e.g. after an SSO/native login redirect).
 */
export type SessionBroadcastMessage =
  | { readonly type: 'activity' }
  | { readonly type: 'warning' }
  | { readonly type: 'logout' }
  | { readonly type: 'login' };

/**
 * Thin wrapper over `BroadcastChannel('kart-admin-session')` — the shared,
 * same-device idle-timer/session-lifecycle sync channel (design-decisions.md
 * "Multi-Tab Session Sync", reusing kart-web's already-established
 * `BroadcastChannel` pattern per security.md §2.1 rather than inventing a
 * new multi-tab mechanism for this app).
 */
@Injectable({ providedIn: 'root' })
export class SessionBroadcastService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly subject = new Subject<SessionBroadcastMessage>();
  private channel: BroadcastChannel | null = null;

  readonly messages$ = this.subject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('kart-admin-session');
      this.channel.onmessage = (event: MessageEvent<SessionBroadcastMessage>) => {
        this.subject.next(event.data);
      };
    }
  }

  post(message: SessionBroadcastMessage): void {
    this.channel?.postMessage(message);
  }

  ngOnDestroy(): void {
    this.channel?.close();
    this.subject.complete();
  }
}
