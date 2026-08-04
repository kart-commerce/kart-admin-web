import { Routes } from '@angular/router';

import { roleGuard } from '../../core/auth/auth.guard';

/**
 * requirement-spec.md §3.3 — Support Agent's own capped surface,
 * deliberately isolated from the four Admin-only feature folders
 * (architecture.md). No kart-admin-service GrantCategory applies to any
 * screen here (the Support Agent's refund cap is a per-agent amount, not a
 * category-grant enum value) — role-gated only.
 */
export const supportConsoleRoutes: Routes = [
  {
    path: '',
    canActivate: [roleGuard('support_agent')],
    children: [
      {
        path: 'orders',
        loadComponent: () =>
          import('./order-lookup-assisted-actions/support-order-lookup/support-order-lookup').then((m) => m.SupportOrderLookup),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./customer-account-assistance/customer-account-assistance/customer-account-assistance').then(
            (m) => m.CustomerAccountAssistance,
          ),
      },
      {
        path: 'refund-requests',
        loadComponent: () =>
          import('./refund-requests-queue/refund-requests-queue/refund-requests-queue').then((m) => m.RefundRequestsQueue),
      },
      {
        path: 'refund-requests/:returnRequestId',
        loadComponent: () =>
          import('./refund-request-approval/refund-request-approval/refund-request-approval').then(
            (m) => m.RefundRequestApproval,
          ),
      },
      { path: '', redirectTo: 'orders', pathMatch: 'full' },
    ],
  },
];
