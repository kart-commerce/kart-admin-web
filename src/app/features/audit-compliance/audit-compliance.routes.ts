import { Routes } from '@angular/router';

import { roleGuard } from '../../core/auth/auth.guard';

/**
 * requirement-spec.md §3.5 — role-gated only (any Admin), no per-category
 * grant on the route itself (tickets.md's Sprint Planner notes: AUD-1/AUD-2
 * are the two exceptions that don't depend on AUTH-5's category gating).
 * AUD-3 (Privacy Requests) is not a separate route — it's nested inside
 * AUD-1's own component, gated at sub-view granularity by the `compliance`
 * grant (design-decisions.md).
 */
export const auditComplianceRoutes: Routes = [
  {
    path: '',
    canActivate: [roleGuard('admin')],
    children: [
      {
        path: 'audit-trail',
        loadComponent: () => import('./audit-trail-viewer/audit-trail-viewer/audit-trail-viewer').then((m) => m.AuditTrailViewer),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./analytics-dashboards/analytics-dashboards/analytics-dashboards').then((m) => m.AnalyticsDashboards),
      },
      { path: '', redirectTo: 'audit-trail', pathMatch: 'full' },
    ],
  },
];
