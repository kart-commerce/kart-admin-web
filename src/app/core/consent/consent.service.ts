import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

import { CONSENT_VERSION, ConsentCategories, ConsentRecord } from './consent.models';

/**
 * `kart_consent` — Necessary-category cookie (privacy.md §A.1: cookie-
 * consent-state itself never requires consent), 1-year expiry (§A.6).
 * Client-readable (not `HttpOnly`) by design — the banner needs to read it
 * without a server round trip; this is not a session/auth cookie, so
 * security.md §1's HttpOnly-token rule doesn't apply to it.
 */
const CONSENT_COOKIE_NAME = 'kart_consent';
const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** `null` means no consent decision has been recorded yet, or the recorded one is stale (privacy.md §A.4). */
  readonly consent = signal<ConsentRecord | null>(this.readStoredConsent());

  /**
   * Single source of truth for whether the Preference Center is open —
   * centralized here (not a component-local signal) so the banner's "Manage
   * Preferences" button and the persistent header entry point (privacy.md
   * §A.3) both open the exact same modal instance, one render tree, no
   * duplicate state to keep in sync.
   */
  readonly preferenceCenterOpen = signal(false);

  /** Whether the banner should be showing — no record yet, or the recorded version is behind `CONSENT_VERSION`. */
  isStale(): boolean {
    const current = this.consent();
    return current === null || current.version < CONSENT_VERSION;
  }

  record(categories: ConsentCategories): void {
    const record: ConsentRecord = { version: CONSENT_VERSION, categories, timestamp: new Date().toISOString() };
    this.consent.set(record);
    if (this.isBrowser) {
      this.writeStoredConsent(record);
    }
  }

  openPreferenceCenter(): void {
    this.preferenceCenterOpen.set(true);
  }

  closePreferenceCenter(): void {
    this.preferenceCenterOpen.set(false);
  }

  private readStoredConsent(): ConsentRecord | null {
    if (!this.isBrowser) {
      return null;
    }
    const raw = this.readCookie(CONSENT_COOKIE_NAME);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(decodeURIComponent(raw)) as ConsentRecord;
    } catch {
      return null;
    }
  }

  private writeStoredConsent(record: ConsentRecord): void {
    const value = encodeURIComponent(JSON.stringify(record));
    this.document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Max-Age=${CONSENT_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Strict`;
  }

  private readCookie(name: string): string | null {
    const match = this.document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? match[1] : null;
  }
}
