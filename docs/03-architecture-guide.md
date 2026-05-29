# 03 — Architecture Guide

## Core Architectural Principles

### 1. Feature-Based Architecture

Group by business domain, not by file type. Every feature is a vertical slice — it owns everything it needs.

```
WRONG (type-based):
services/
  auth.service.ts
  lead.service.ts
components/
  auth-login.component.ts
  lead-list.component.ts

RIGHT (feature-based):
features/auth/
  services/auth.service.ts
  pages/login-page/login-page.component.ts
features/leads/
  services/lead.service.ts
  pages/leads-list-page/leads-list-page.component.ts
```

**Why**: When a feature is deleted, everything in its folder goes with it. No orphaned files.

---

### 2. Smart vs Dumb Components

This is the most important pattern for maintaining large Angular apps.

#### Smart Component (Container)

- Lives in `pages/`
- Knows about services, state, routing
- Orchestrates data and passes it down
- Handles side effects

```typescript
// leads-list-page.component.ts (SMART)
@Component({
  selector: 'app-leads-list-page',
  standalone: true,
  imports: [LeadsTableComponent, LeadFiltersComponent, MatProgressSpinnerModule],
  template: `
    <app-lead-filters
      [stages]="stages()"
      (filtersChanged)="onFiltersChanged($event)"
    />
    <app-leads-table
      [leads]="leads()"
      [isLoading]="isLoading()"
      (editClicked)="onEdit($event)"
      (deleteClicked)="onDelete($event)"
    />
  `,
})
export class LeadsListPageComponent {
  private leadService = inject(LeadService);
  private router = inject(Router);

  leads = this.leadService.leads;
  stages = this.leadService.stages;
  isLoading = this.leadService.isLoading;

  onEdit(id: number): void {
    this.router.navigate(['/leads', id, 'edit']);
  }

  onDelete(id: number): void {
    this.leadService.deleteLead(id);
  }

  onFiltersChanged(filters: LeadFilters): void {
    this.leadService.applyFilters(filters);
  }
}
```

#### Dumb Component (Presentation)

- Lives in `components/` or `shared/components/`
- Receives data via `@input()`
- Emits events via `output()`
- Knows nothing about services, routing, or state

```typescript
// leads-table.component.ts (DUMB)
@Component({
  selector: 'app-leads-table',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-table [dataSource]="leads()">
      <ng-container matColumnDef="name">
        <mat-header-cell *matHeaderCellDef>Name</mat-header-cell>
        <mat-cell *matCellDef="let row">{{ row.name }}</mat-cell>
      </ng-container>
      <!-- actions column -->
      <ng-container matColumnDef="actions">
        <mat-cell *matCellDef="let row">
          <button mat-icon-button (click)="editClicked.emit(row.id)">
            <mat-icon>edit</mat-icon>
          </button>
        </mat-cell>
      </ng-container>
    </mat-table>
  `,
})
export class LeadsTableComponent {
  leads = input.required<Lead[]>();
  isLoading = input<boolean>(false);

  editClicked = output<number>();
  deleteClicked = output<number>();
}
```

---

### 3. Dependency Flow (One Direction Only)

```
app.routes.ts
    └── features/leads/leads.routes.ts
            └── pages/leads-list-page (SMART — uses services, state)
                    └── components/leads-table (DUMB — uses inputs/outputs)
                    └── components/lead-filters (DUMB)
                            └── shared/components/form-field (DUMB)
```

**Rule**: Dependencies flow DOWN only. A dumb component never imports a smart one.

---

### 4. Separation of Concerns

Each layer has one job:

| Layer | Job | Must NOT |
|---|---|---|
| Component (template) | Render UI | Contain business logic |
| Component (class) | Wire data to template | Call HTTP directly |
| Service | Business logic + HTTP | Know about UI/routing |
| State (signals) | Hold reactive data | Call HTTP directly |
| Interceptor | Transform HTTP requests | Know about business domain |
| Guard | Gate routes | Have UI side effects |

---

### 5. Architecture Diagram

```
┌──────────────────────────────────────────────────┐
│                     Browser                       │
└──────────────────────────┬───────────────────────┘
                           │
┌──────────────────────────▼───────────────────────┐
│                  Angular Router                    │
│              (lazy-loaded routes)                  │
└──────────────────────────┬───────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
┌────────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐
│   Feature A   │  │   Feature B  │  │  Feature C  │
│  (leads)      │  │  (dashboard) │  │  (settings) │
│               │  │              │  │             │
│  SmartPage    │  │  SmartPage   │  │  SmartPage  │
│  DumbComps    │  │  DumbComps   │  │  DumbComps  │
│  Service      │  │  Service     │  │  Service    │
│  State        │  │  State       │  │  State      │
└───────┬───────┘  └──────┬───────┘  └──────┬──────┘
        │                 │                  │
        └─────────────────▼──────────────────┘
                          │
          ┌───────────────┼──────────────────┐
          │               │                  │
   ┌──────▼──────┐  ┌─────▼──────┐  ┌───────▼──────┐
   │  ApiService │  │ AuthService│  │ GlobalSignals │
   │  (core/http)│  │ (core/auth)│  │  (core/store) │
   └──────┬──────┘  └────────────┘  └──────────────┘
          │
   ┌──────▼──────┐
   │  HttpClient  │  ← interceptors (auth, error, loading)
   └──────┬──────┘
          │
   ┌──────▼──────┐
   │  REST API    │
   └─────────────┘
```

---

### 6. Standalone Component Pattern

Angular 20 uses standalone components exclusively. No NgModule.

```typescript
// app.config.ts — root configuration
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
  ],
};
```

---

### 7. Reusable Component Strategy

Promote a component from `feature/components/` to `shared/components/` only when:
1. Two or more features need the same component
2. The component has zero feature-specific knowledge
3. It communicates only via `input()` / `output()`

**Never prematurely abstract.** Three uses of a similar component is the threshold for extraction.

---

## Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Logic in templates | Hard to test, poor readability | Move to component class |
| Singleton services for feature data | Shared state leaks between sessions | Use feature-local services |
| One giant `AppModule` | Blocks lazy loading | Use standalone + feature routes |
| Components that call `HttpClient` directly | Untestable, breaks SRP | Always go through a service |
| Nested subscriptions | Memory leaks, spaghetti | Use `switchMap`, `async` pipe, signals |

---

## Scalability Recommendations

1. **Enforce module boundaries** — use ESLint rules to prevent cross-feature imports.
2. **Barrel files (`index.ts`)** — export only public API from each feature.
3. **Feature flags** — wrap new features behind an environment flag during development.
4. **Max 200 lines per component class** — split if larger.
