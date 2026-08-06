/**
 * Client-visible auth/session shapes. The browser never sees an
 * access/refresh token (security.md §1's BFF pattern) — the BFF translates
 * every kart-identity-service/kart-admin-service response into one of these.
 */
export type Role = 'admin' | 'support_agent';

/**
 * kart-admin-service api-contract.yaml's GrantCategory enum, plus the
 * `compliance` sixth value (edge-cases.md "Privacy Requests View's Blanket
 * 'Any Admin' Read Access Over-Exposes GDPR-Sensitive Data", XTEAM-1). Kept
 * as a union here for compile-time exhaustiveness in this app's own code;
 * IDN-2's category dropdown still sources its *options* dynamically from
 * `GET /admin/permission-grants`'s observed categories / a dedicated
 * enum-list endpoint, never hardcoding the dropdown itself, per tickets.md's
 * explicit instruction — this type only bounds what this app understands
 * how to render/gate, it is not IDN-2's source of dropdown options.
 */
export type GrantCategory =
  | 'catalog-management'
  | 'coupon-issuance'
  | 'user-suspension'
  | 'inventory-replenishment'
  | 'permission-management'
  | 'compliance';

export interface SessionInfo {
  readonly authenticated: boolean;
  readonly role: Role | null;
  readonly principalId: string | null;
  /**
   * Category grants held at session-load time — a render-time snapshot, per
   * requirement-spec.md §5 and design-decisions.md "Category-Grant UI
   * Gating": UX convenience only, the backend re-checks live on every
   * request regardless of what this array says (edge-cases.md "Support
   * Agent's Refund-Approval Cap Changes Between Viewing and Approving").
   */
  readonly grants: readonly GrantCategory[];
  /**
   * True when `grants` may be incomplete because kart-admin-service couldn't actually be
   * reached/checked at login time — as opposed to a genuine zero-grants principal. Drives
   * `GrantsDegradedToast` (core/auth/grants-degraded-toast/); never used for access
   * decisions, same render-time-snapshot caveat as `grants` itself.
   */
  readonly grantsDegraded: boolean;
  /** ISO timestamp this session's tokens were first issued — feeds AUTH-4's absolute-cap countdown. */
  readonly loginAt: string | null;
  /** ISO timestamp of the server-computed absolute session cap (security.md §2.2) — never computed client-side. */
  readonly absoluteCapAt: string | null;
}

export const UNAUTHENTICATED_SESSION: SessionInfo = {
  authenticated: false,
  role: null,
  principalId: null,
  grants: [],
  grantsDegraded: false,
  loginAt: null,
  absoluteCapAt: null,
};

export interface NativeLoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface MfaChallenge {
  readonly challengeId: string;
  readonly expiresInSeconds: number;
}

export interface MfaVerifyRequest {
  readonly challengeId: string;
  readonly totpCode: string;
}

/**
 * kart-identity-service's `/auth/login` mandates MFA for both Admin and
 * Support Agent (api-contract.yaml — "If the resolved role requires MFA
 * (Admin, Support Agent — mandatory)..."), so a native login always has two
 * possible outcomes: immediately authenticated, or a pending MFA challenge
 * that `NativeLogin` must complete via `/api/bff/auth/native/mfa/verify`.
 */
export type NativeLoginResult =
  | { readonly status: 'authenticated'; readonly session: SessionInfo }
  | { readonly status: 'mfa-required'; readonly challenge: MfaChallenge };

export interface RefundCap {
  /** Support Agent's own per-order refund-amount grant (requirement-spec.md §5, §3.3) — null for Admin (no cap). */
  readonly amount: number;
  readonly currency: string;
}
