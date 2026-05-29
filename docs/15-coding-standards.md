# 15 — Coding Standards

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Component | `kebab-case.component.ts` | `lead-detail.component.ts` |
| Service | `kebab-case.service.ts` | `lead.service.ts` |
| Guard | `kebab-case.guard.ts` | `auth.guard.ts` |
| Interceptor | `kebab-case.interceptor.ts` | `auth.interceptor.ts` |
| Resolver | `kebab-case.resolver.ts` | `lead.resolver.ts` |
| Pipe | `kebab-case.pipe.ts` | `date-format.pipe.ts` |
| Directive | `kebab-case.directive.ts` | `click-outside.directive.ts` |
| Model | `kebab-case.model.ts` | `lead.model.ts` |
| Routes | `kebab-case.routes.ts` | `leads.routes.ts` |
| Spec | `*.spec.ts` | `lead.service.spec.ts` |

---

## TypeScript Standards

```typescript
// ALWAYS: explicit return types on public methods
getLeadById(id: number): Observable<Lead> { ... }

// ALWAYS: interfaces over type aliases for objects
interface Lead {
  id: number;
  name: string;
}

// NEVER: any
const data: unknown = response;   // use unknown, not any

// ALWAYS: const assertions for config objects
const CONFIG = {
  maxRetries: 3,
  timeout: 5000,
} as const;

// ALWAYS: optional chaining over null checks
const name = lead?.assignedTo?.name ?? 'Unassigned';

// ALWAYS: readonly for immutable data
interface LeadState {
  readonly leads: ReadonlyArray<Lead>;
}
```

---

## Component Standards

```typescript
// ALWAYS: these 4 in this order
@Component({
  selector: 'app-lead-detail',       // 1. selector (kebab-case, app- prefix)
  standalone: true,                   // 2. standalone always true
  imports: [...],                     // 3. imports
  changeDetection: ChangeDetectionStrategy.OnPush,  // 4. OnPush always
  template: `...`,
})
export class LeadDetailComponent implements OnInit {
  // 1. inject() over constructor injection
  private leadService = inject(LeadService);
  private router = inject(Router);

  // 2. inputs (new signal-based API)
  leadId = input.required<number>();
  isReadOnly = input(false);

  // 3. outputs
  closed = output<void>();

  // 4. signals (local state)
  isLoading = signal(false);

  // 5. computed
  pageTitle = computed(() => `Lead #${this.leadId()}`);

  // 6. lifecycle hooks
  ngOnInit(): void {
    this.loadData();
  }

  // 7. public methods
  onSave(): void { ... }

  // 8. private methods
  private loadData(): void { ... }
}
```

---

## Service Standards

```typescript
@Injectable({ providedIn: 'root' })  // Always 'root' unless scoped
export class LeadService {
  // 1. Dependencies
  private api = inject(ApiService);

  // 2. Private writable signals
  private _leads = signal<Lead[]>([]);
  private _isLoading = signal(false);

  // 3. Public readonly signals
  leads = this._leads.asReadonly();
  isLoading = this._isLoading.asReadonly();

  // 4. Computed
  leadCount = computed(() => this._leads().length);

  // 5. Public methods (verbs)
  loadLeads(params: LeadSearchDto): void { ... }
  createLead(dto: CreateLeadDto): Observable<Lead> { ... }

  // 6. Private helpers
  private mapResponse(raw: unknown): Lead { ... }
}
```

---

## RxJS Standards

```typescript
// ALWAYS: use operators, not nested subscribes
// WRONG:
this.userService.getUser().subscribe(user => {
  this.leadService.getLeads(user.id).subscribe(leads => { ... });
});

// RIGHT:
this.userService.getUser().pipe(
  switchMap(user => this.leadService.getLeads(user.id)),
  takeUntilDestroyed(this.destroyRef),
).subscribe(leads => { ... });

// ALWAYS: name observable variables with $ suffix
leads$ = this.leadService.getLeads();

// ALWAYS: complete/unsubscribe
this.data$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
```

---

## Import Ordering

```typescript
// 1. Angular core
import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

// 2. Angular libraries
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

// 3. Angular Material (alphabetical)
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';

// 4. Third-party (alphabetical)
import { catchError, map, switchMap } from 'rxjs/operators';

// 5. Internal — absolute aliases
import { AuthService } from '@core/auth/auth.service';
import { Lead } from '@shared/models/lead.model';

// 6. Internal — relative
import { LeadFormComponent } from './lead-form.component';

// 7. Types (separate import)
import type { CreateLeadDto } from './lead.model';
```

---

## Template Standards

```html
<!-- ALWAYS: new control flow syntax (@if, @for, @switch) -->
@if (isLoading()) {
  <app-loading-spinner />
} @else {
  <app-leads-table [leads]="leads()" />
}

@for (lead of leads(); track lead.id) {
  <app-lead-card [lead]="lead" />
} @empty {
  <p>No leads found.</p>
}

<!-- ALWAYS: data-testid for E2E tests -->
<button
  mat-raised-button
  color="primary"
  data-testid="create-lead-btn"
  (click)="onCreate()"
>
  Create Lead
</button>

<!-- NEVER: logic in templates -->
<!-- WRONG: -->
<div>{{ lead.firstName + ' ' + lead.lastName }}</div>
<!-- RIGHT: -->
<div>{{ lead.fullName }}</div>
```

---

## Naming Conventions Summary

| Item | Convention | Example |
|---|---|---|
| Components | PascalCase | `LeadDetailComponent` |
| Services | PascalCase + Service | `LeadService` |
| Signals | camelCase | `isLoading`, `currentUser` |
| Computed | camelCase | `leadCount`, `hasLeads` |
| Observables | camelCase + `$` | `leads$`, `user$` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Interfaces | PascalCase | `Lead`, `CreateLeadDto` |
| Enums | PascalCase | `LeadStatus` |
| Enum values | UPPER_SNAKE_CASE | `LeadStatus.NOT_CONTACTED` |
| Route paths | kebab-case | `/lead-details/:id` |

---

## Linting Rules (eslint)

Key rules enforced:

```json
{
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/explicit-function-return-type": "warn",
  "@typescript-eslint/no-unused-vars": "error",
  "@angular-eslint/prefer-on-push-change-detection": "error",
  "@angular-eslint/no-empty-lifecycle-method": "error",
  "no-console": ["warn", { "allow": ["warn", "error"] }],
  "prefer-const": "error",
  "no-var": "error"
}
```
