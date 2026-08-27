import { Routes } from '@angular/router';

import { AccessDenied } from './core/auth/access-denied/access-denied';
import { authenticatedGuard } from './core/auth/auth.guard';
import { LoginPage } from './core/auth/login-page/login-page';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'access-denied', component: AccessDenied },
  {
    path: 'catalog',
    canActivate: [authenticatedGuard],
    loadChildren: () => import('./features/catalog-management/catalog-management.routes').then((m) => m.catalogManagementRoutes),
  },
  {
    path: 'order-exceptions',
    canActivate: [authenticatedGuard],
    loadChildren: () => import('./features/order-exceptions/order-exceptions.routes').then((m) => m.orderExceptionsRoutes),
  },
  {
    path: 'order-management',
    canActivate: [authenticatedGuard],
    loadChildren: () => import('./features/order-management/order-management.routes').then((m) => m.orderManagementRoutes),
  },
  {
    path: 'support-console',
    canActivate: [authenticatedGuard],
    loadChildren: () => import('./features/support-console/support-console.routes').then((m) => m.supportConsoleRoutes),
  },
  {
    path: 'identity-admin',
    canActivate: [authenticatedGuard],
    loadChildren: () => import('./features/identity-admin/identity-admin.routes').then((m) => m.identityAdminRoutes),
  },
  {
    path: 'audit-compliance',
    canActivate: [authenticatedGuard],
    loadChildren: () => import('./features/audit-compliance/audit-compliance.routes').then((m) => m.auditComplianceRoutes),
  },
  {
    path: 'ai-assistant',
    canActivate: [authenticatedGuard],
    loadChildren: () => import('./features/ai-assistant/ai-assistant.routes').then((m) => m.aiAssistantRoutes),
  },
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./core/dashboard/dashboard').then((m) => m.Dashboard),
    pathMatch: 'full',
  },
];
