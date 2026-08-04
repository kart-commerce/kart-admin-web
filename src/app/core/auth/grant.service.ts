import { Injectable, computed, inject } from '@angular/core';

import { AuthService } from './auth.service';
import { GrantCategory } from './models';

/**
 * Render-time category-grant check (AUTH-5, requirement-spec.md §5;
 * design-decisions.md "Category-Grant UI Gating — Layered Route Guard +
 * Render-Time Control Check"). UX convenience only — `kart-admin-service`
 * re-checks the same grant live, per request, and is the sole enforcement
 * point regardless of what this returns (edge-cases.md's "Support Agent's
 * Refund-Approval Cap Changes Between Viewing and Approving").
 */
@Injectable({ providedIn: 'root' })
export class GrantService {
  private readonly authService = inject(AuthService);

  /** `Admin` holding any category grant, or any authenticated `Admin` for role-only (no per-category) screens like AUD-1/AUD-2. */
  readonly isAdmin = computed(() => this.authService.session().role === 'admin');
  readonly isSupportAgent = computed(() => this.authService.session().role === 'support_agent');

  has(category: GrantCategory): boolean {
    return this.authService.session().grants.includes(category);
  }
}
