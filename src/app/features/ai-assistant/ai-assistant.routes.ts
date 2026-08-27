import { Routes } from '@angular/router';

/**
 * requirement-spec.md §3.6 — "Admin and Support Agent roles, identical
 * access, no role differentiation." Unlike every other feature folder
 * (audit-compliance, order-management, support-console), this route adds no
 * `roleGuard`/`categoryGrantGuard` of its own — `authenticatedGuard` alone,
 * composed at `app.routes.ts`'s level the same way it already is for every
 * other top-level feature path, is the entire access check this feature
 * needs. This is a legitimate first instance of a route with no
 * role-specific gating on top of authentication (no existing feature in
 * this app is reachable identically by both roles with zero extra
 * restriction).
 */
export const aiAssistantRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./chat/chat-panel/chat-panel').then((m) => m.ChatPanel),
  },
];
