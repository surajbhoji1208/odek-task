# 05 — State Management

## Strategy Overview

| State type | Tool | Scope |
|---|---|---|
| Server/async data | RxJS + Signals | Feature service |
| Local UI state | Component signals | Component |
| Cross-feature global state | Signals in `core/store/` | App-wide |
| Complex event-driven | NgRx (if needed) | App-wide |

**Rule**: Start with signals + services. Add NgRx only when cross-feature state becomes a coordination problem.

---

## Angular Signals — Core Concepts

```typescript
import { signal, computed, effect } from '@angular/core';

// Writable signal
const count = signal(0);

// Read it
console.log(count()); // 0

// Update
count.set(1);
count.update(c => c + 1);

// Computed (derived, lazy)
const doubled = computed(() => count() * 2);

// Effect (side effects — use sparingly)
effect(() => {
  console.log('Count changed:', count());
});
```

---

## Feature State Service Pattern

Each feature owns a state service that holds signals + makes HTTP calls.

```typescript
// features/leads/services/lead.service.ts
@Injectable({ providedIn: 'root' })
export class LeadService {
  private http = inject(HttpClient);
  private apiService = inject(ApiService);

  // #region State

  private _leads = signal<Lead[]>([]);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);
  private _totalCount = signal(0);

  // Public read-only signals
  leads = this._leads.asReadonly();
  isLoading = this._isLoading.asReadonly();
  error = this._error.asReadonly();
  totalCount = this._totalCount.asReadonly();

  // Computed
  leadCount = computed(() => this._leads().length);
  hasLeads = computed(() => this._leads().length > 0);

  // #endregion

  // #region Actions

  loadLeads(params: LeadSearchParams): void {
    this._isLoading.set(true);
    this._error.set(null);

    this.apiService
      .get<PaginatedResponse<Lead>>('/leads', { params })
      .pipe(finalize(() => this._isLoading.set(false)))
      .subscribe({
        next: response => {
          this._leads.set(response.results);
          this._totalCount.set(response.totalCount);
        },
        error: err => this._error.set(err.message),
      });
  }

  createLead(dto: CreateLeadDto): Observable<Lead> {
    return this.apiService.post<Lead>('/leads', dto).pipe(
      tap(lead => this._leads.update(leads => [...leads, lead])),
    );
  }

  updateLead(id: number, dto: UpdateLeadDto): Observable<Lead> {
    return this.apiService.put<Lead>(`/leads/${id}`, dto).pipe(
      tap(updated =>
        this._leads.update(leads =>
          leads.map(l => (l.id === id ? updated : l)),
        ),
      ),
    );
  }

  deleteLead(id: number): void {
    this.apiService.delete(`/leads/${id}`).subscribe({
      next: () => this._leads.update(leads => leads.filter(l => l.id !== id)),
      error: err => this._error.set(err.message),
    });
  }

  // #endregion
}
```

---

## Global App State (cross-feature)

```typescript
// core/store/app.state.ts
import { Injectable, signal, computed } from '@angular/core';
import { User } from '../auth/models/user.model';

@Injectable({ providedIn: 'root' })
export class AppState {
  // Auth
  private _currentUser = signal<User | null>(null);
  private _sidebarOpen = signal(true);
  private _theme = signal<'light' | 'dark'>('light');

  currentUser = this._currentUser.asReadonly();
  sidebarOpen = this._sidebarOpen.asReadonly();
  theme = this._theme.asReadonly();

  isAuthenticated = computed(() => this._currentUser() !== null);
  userRole = computed(() => this._currentUser()?.role ?? null);
  userFullName = computed(() => {
    const user = this._currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  setCurrentUser(user: User | null): void {
    this._currentUser.set(user);
  }

  toggleSidebar(): void {
    this._sidebarOpen.update(open => !open);
  }

  setTheme(theme: 'light' | 'dark'): void {
    this._theme.set(theme);
  }
}
```

---

## toSignal — Bridging RxJS to Signals

Use `toSignal` to convert Observables into signals inside components:

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

@Component({ standalone: true, /* ... */ })
export class LeadsListPageComponent {
  private leadService = inject(LeadService);
  private route = inject(ActivatedRoute);

  // Convert Observable query params to signal
  private queryParams = toSignal(this.route.queryParams, { initialValue: {} });

  leads = this.leadService.leads;
  isLoading = this.leadService.isLoading;
}
```

---

## toObservable — Bridging Signals to RxJS

When you need to react to signal changes with RxJS operators:

```typescript
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class LeadService {
  private searchQuery = signal('');

  // Auto-reload when search changes (debounced)
  private autoSearch$ = toObservable(this.searchQuery).pipe(
    debounceTime(400),
    distinctUntilChanged(),
    switchMap(query => this.http.get<Lead[]>('/leads', { params: { q: query } })),
  );
}
```

---

## Local Component State

Simple UI state stays in the component. No service needed.

```typescript
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })
export class LeadFiltersComponent {
  isExpanded = signal(false);
  selectedStage = signal<number | null>(null);
  dateRange = signal<DateRange>({ from: null, to: null });

  toggleExpanded(): void {
    this.isExpanded.update(v => !v);
  }

  selectStage(id: number): void {
    this.selectedStage.set(id);
  }
}
```

---

## RxJS Best Practices

### 1. Always unsubscribe

```typescript
// WRONG — memory leak
ngOnInit() {
  this.service.data$.subscribe(data => this.data = data);
}

// RIGHT — async pipe unsubscribes automatically
// In template: {{ data$ | async }}

// RIGHT — takeUntilDestroyed
private destroyRef = inject(DestroyRef);
ngOnInit() {
  this.service.data$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(data => this.data.set(data));
}
```

### 2. Prefer high-order operators over nested subscriptions

```typescript
// WRONG
this.form.valueChanges.subscribe(v => {
  this.leadService.search(v).subscribe(results => {
    this.results = results;
  });
});

// RIGHT
this.form.valueChanges.pipe(
  debounceTime(300),
  switchMap(v => this.leadService.search(v)),
  takeUntilDestroyed(this.destroyRef),
).subscribe(results => this.results.set(results));
```

### 3. Share expensive Observables

```typescript
private shared$ = this.http.get('/expensive-endpoint').pipe(
  shareReplay(1),
);
```

---

## When to Use NgRx

Add NgRx (`@ngrx/store` + `@ngrx/effects`) only when:

1. Multiple features need to react to the same events
2. Complex undo/redo is required
3. Time-travel debugging is essential
4. The team is large (10+ developers) and state ownership is unclear

For 80% of enterprise apps, Signals + RxJS is sufficient and far simpler.

---

## Anti-Patterns

| Anti-pattern | Problem |
|---|---|
| `BehaviorSubject` exposed publicly | Callers can `.next()` directly — breaks encapsulation |
| Component subscribing to multiple streams separately | Use `combineLatest` or `forkJoin` |
| Storing derived state (already computable from other signals) | Use `computed()` instead |
| Effects for everything | Effects have hidden ordering; prefer direct calls |
| Global state for feature-local data | Pollutes the store and causes stale data bugs |
