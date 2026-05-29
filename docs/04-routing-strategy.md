# 04 — Routing Strategy

## Overview

Angular 20 routing uses standalone APIs. Every route is lazily loaded. Guards and resolvers are plain functions. No `NgModule` wiring required.

---

## Root Routes

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';
import { roleGuard } from '@core/auth/role.guard';
import { ShellComponent } from '@core/layout/shell/shell.component';

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
      {
        path: 'leads',
        loadChildren: () =>
          import('./features/leads/leads.routes').then(m => m.LEADS_ROUTES),
        canActivate: [roleGuard(['admin', 'manager'])],
        title: 'Leads',
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then(m => m.SETTINGS_ROUTES),
        canActivate: [roleGuard(['admin'])],
        title: 'Settings',
      },
    ],
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
    title: 'Login',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./core/layout/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: '404 — Not Found',
  },
];
```

---

## Feature Routes

```typescript
// features/leads/leads.routes.ts
import { Routes } from '@angular/router';
import { leadResolver } from './resolvers/lead.resolver';

export const LEADS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/leads-list-page/leads-list-page.component').then(
        m => m.LeadsListPageComponent,
      ),
    title: 'All Leads',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/lead-detail-page/lead-detail-page.component').then(
        m => m.LeadDetailPageComponent,
      ),
    resolve: { lead: leadResolver },
    title: 'Lead Detail',
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/lead-form-page/lead-form-page.component').then(
        m => m.LeadFormPageComponent,
      ),
    resolve: { lead: leadResolver },
    title: 'Edit Lead',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/lead-form-page/lead-form-page.component').then(
        m => m.LeadFormPageComponent,
      ),
    title: 'New Lead',
  },
];
```

---

## Functional Guards

### Auth Guard

```typescript
// core/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: window.location.pathname },
  });
};
```

### Role Guard

```typescript
// core/auth/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn =>
  () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const userRole = authService.currentUser()?.role;

    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    return router.createUrlTree(['/403']);
  };
```

---

## Functional Resolvers

Resolvers prefetch data before the route activates — no loading spinner in the component.

```typescript
// features/leads/resolvers/lead.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { LeadService } from '../services/lead.service';
import { Lead } from '../models/lead.model';

export const leadResolver: ResolveFn<Lead> = route => {
  const leadService = inject(LeadService);
  const id = Number(route.paramMap.get('id'));
  return leadService.getLeadById(id);
};
```

Access resolved data in the component:

```typescript
@Component({ standalone: true, /* ... */ })
export class LeadDetailPageComponent {
  private route = inject(ActivatedRoute);

  lead = toSignal(
    this.route.data.pipe(map(data => data['lead'] as Lead))
  );
}
```

---

## Route Titles

Angular 20 supports automatic document title management:

```typescript
// app.config.ts
import { provideRouter, withTitleStrategy } from '@angular/router';
import { TitleStrategy } from '@angular/router';

@Injectable()
class AppTitleStrategy extends TitleStrategy {
  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    document.title = title ? `${title} — MyApp` : 'MyApp';
  }
}

// In providers:
{ provide: TitleStrategy, useClass: AppTitleStrategy }
```

---

## Route Preloading

Preload all lazy routes after the app bootstraps:

```typescript
provideRouter(routes, withPreloading(PreloadAllModules))
```

For selective preloading (preload only high-priority routes):

```typescript
// core/routing/selective-preload.strategy.ts
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SelectivePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return route.data?.['preload'] === true ? load() : of(null);
  }
}

// In route definition:
{ path: 'dashboard', data: { preload: true }, loadChildren: ... }
```

---

## Navigation Helpers

```typescript
// core/routing/navigation.service.ts
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private router = inject(Router);

  goToLeadDetail(id: number): void {
    this.router.navigate(['/leads', id]);
  }

  goToLeadEdit(id: number): void {
    this.router.navigate(['/leads', id, 'edit']);
  }

  goToLogin(returnUrl?: string): void {
    this.router.navigate(['/auth/login'], {
      queryParams: returnUrl ? { returnUrl } : {},
    });
  }

  back(): void {
    window.history.back();
  }
}
```

---

## Anti-Patterns

| Anti-pattern | Problem |
|---|---|
| Eager-loading all routes | Huge initial bundle — users wait on login page load |
| Logic inside route definitions | Hard to test; route files should be config-only |
| `CanActivate` class-based guards | Deprecated in Angular 15+; use functional guards |
| Direct `window.location` navigation | Bypasses Angular Router, breaks SSR |
| No route titles | Poor SEO and browser tab UX |

---

## Route Structure Convention

```
/                      → redirects to /dashboard
/auth/login            → public
/auth/register         → public
/dashboard             → protected (any authenticated user)
/leads                 → protected (admin, manager)
/leads/:id             → protected
/leads/:id/edit        → protected
/leads/new             → protected
/settings              → protected (admin only)
/settings/lead-stages  → protected (admin only)
/403                   → forbidden page (public component)
/404 (** catch-all)    → not found page
```
