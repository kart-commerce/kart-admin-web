import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

const STORAGE_KEY_PREFIX = 'kart-admin-draft:';

/**
 * Client-side draft persistence for genuinely multi-step Admin forms
 * (permission-grant edits, bulk catalog operations) — AUTH-4's second line
 * of defense against the absolute session cap's hard, unavoidable cutoff
 * (design-decisions.md "Absolute-Session-Cap Advance Warning + Client-Side
 * Draft Persistence"). Stores only form-field content under a storage key
 * distinct from any session/token data — this app never writes a token to
 * `localStorage`/`sessionStorage` (security.md §1), and this store must
 * never blur that boundary just because it also uses browser storage.
 */
@Injectable({ providedIn: 'root' })
export class DraftStoreService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  save<T>(key: string, value: T): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage can legitimately be unavailable (quota exceeded, private
      // browsing) — a lost draft is a UX regression, not a functional one.
    }
  }

  load<T>(key: string): T | null {
    if (!this.isBrowser) {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  clear(key: string): void {
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + key);
    }
  }
}
