import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ShellComponent } from './core/layout/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
        title: 'Dashboard',
      },
    ],
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: '403',
    loadComponent: () =>
      import('./core/layout/no-permission/no-permission.componet').then(m => m.NoPermissionComponent),
    title: '403 — No Permission',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./core/layout/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: '404 — Not Found',
  },
];
