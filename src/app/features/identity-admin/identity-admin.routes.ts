import { Routes } from '@angular/router';

import { categoryGrantGuard, roleGuard } from '../../core/auth/auth.guard';

/** requirement-spec.md §3.4 — Admin role, per-screen category grant (AUTH-5). */
export const identityAdminRoutes: Routes = [
  {
    path: '',
    canActivate: [roleGuard('admin')],
    children: [
      {
        path: 'users',
        canActivate: [categoryGrantGuard('user-suspension')],
        loadComponent: () => import('./user-lock-unlock/user-lock-unlock/user-lock-unlock').then((m) => m.UserLockUnlock),
      },
      {
        path: 'grants',
        canActivate: [categoryGrantGuard('permission-management')],
        loadComponent: () =>
          import('./permission-grant-management/permission-grant-management/permission-grant-management').then(
            (m) => m.PermissionGrantManagement,
          ),
      },
      { path: '', redirectTo: 'users', pathMatch: 'full' },
    ],
  },
];
