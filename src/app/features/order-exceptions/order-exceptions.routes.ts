import { Routes } from '@angular/router';

import { roleGuard } from '../../core/auth/auth.guard';

/** requirement-spec.md §3.2 — Admin role. No matching kart-admin-service GrantCategory for orders, so this is role-gated only. */
export const orderExceptionsRoutes: Routes = [
  {
    path: '',
    canActivate: [roleGuard('admin')],
    children: [
      {
        path: 'orders',
        loadComponent: () => import('./order-lookup/order-detail/order-detail').then((m) => m.OrderDetail),
      },
      { path: '', redirectTo: 'orders', pathMatch: 'full' },
    ],
  },
];
