import { Routes } from '@angular/router';

import { categoryGrantGuard, roleGuard } from '../../core/auth/auth.guard';

/** requirement-spec.md §3.1 — Admin role, `catalog-management` category grant (AUTH-5). */
export const catalogManagementRoutes: Routes = [
  {
    path: '',
    canActivate: [roleGuard('admin'), categoryGrantGuard('catalog-management')],
    children: [
      {
        path: 'categories',
        loadComponent: () => import('./category-management/category-tree/category-tree').then((m) => m.CategoryTree),
      },
      {
        path: 'products',
        loadComponent: () => import('./product-management/product-list/product-list').then((m) => m.ProductList),
      },
      {
        path: 'coupons',
        loadComponent: () => import('./coupon-management/coupon-list/coupon-list').then((m) => m.CouponList),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./inventory-replenishment/inventory-replenishment/inventory-replenishment').then(
            (m) => m.InventoryReplenishment,
          ),
      },
      { path: '', redirectTo: 'products', pathMatch: 'full' },
    ],
  },
];
