import { Routes } from '@angular/router';

import { categoryGrantGuard, roleGuard } from '../../core/auth/auth.guard';

/** Order Management (Admin) flow #7 — Admin role, `order-management` category grant (AUTH-5). */
export const orderManagementRoutes: Routes = [
  {
    path: '',
    canActivate: [roleGuard('admin'), categoryGrantGuard('order-management')],
    children: [
      {
        path: 'orders',
        loadComponent: () => import('./order-list/order-list').then((m) => m.OrderList),
      },
      {
        path: 'orders/:orderId',
        loadComponent: () => import('./order-detail/order-detail').then((m) => m.OrderDetail),
      },
      { path: '', redirectTo: 'orders', pathMatch: 'full' },
    ],
  },
];
