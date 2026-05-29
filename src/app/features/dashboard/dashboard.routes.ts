import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard-page/dashboard-page.component').then(
        m => m.DashboardPageComponent,
      ),
    title: 'Dashboard',
  },
  {
    path: 'my-dashboard',
    loadComponent: () =>
      import('./pages/dashboard-page/my-dahsboard-page.component').then(
        m => m.MyDashboardPageComponent,
      ),
    title: 'My Dashboard',
    canActivate: [roleGuard(["manager"])],
  },
];
