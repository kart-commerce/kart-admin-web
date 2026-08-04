/**
 * privacy.md §A — cookie consent categories/versioning, shared mechanism
 * with kart-web ("the mechanism is identical, the volume differs"). This
 * app in practice only ever sets `Necessary` cookies (no anonymous
 * marketing/analytics surface) — Analytics/Marketing/Preference stay
 * present and toggleable for policy-consistency (privacy.md's own words),
 * so the mechanism is already in place the moment this app ever does add
 * one of those categories, rather than being retrofitted then.
 */
export type ConsentCategory = 'analytics' | 'marketing' | 'preference';

export interface ConsentCategories {
  readonly analytics: boolean;
  readonly marketing: boolean;
  readonly preference: boolean;
}

export interface ConsentRecord {
  readonly version: number;
  readonly categories: ConsentCategories;
  readonly timestamp: string;
}

/** Bumped whenever the cookie-category list or purpose descriptions materially change (privacy.md §A.4). */
export const CONSENT_VERSION = 1;

export const ALL_REJECTED: ConsentCategories = { analytics: false, marketing: false, preference: false };
export const ALL_ACCEPTED: ConsentCategories = { analytics: true, marketing: true, preference: true };
