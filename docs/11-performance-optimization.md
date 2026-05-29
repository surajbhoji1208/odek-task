# 11 — Performance Optimization

## 1. OnPush Change Detection

Use `OnPush` on every dumb component. Angular only re-renders when:
- An `input()` reference changes
- An event inside the component fires
- A signal it reads changes

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class LeadsTableComponent {
  leads = input.required<Lead[]>();
}
```

**Never** use `Default` change detection on dumb components.

---

## 2. Signals Replace Zone.js Overhead

Signals trigger precisely targeted re-renders — only the DOM nodes that read the changed signal update.

```typescript
// BEFORE (triggers zone-based CD for the whole tree):
this.leads = await this.leadService.getLeads();

// AFTER (only re-renders components reading this signal):
this._leads.set(response.results);
```

Enable signal-based components (experimental in Angular 20):

```typescript
// tsconfig.json
{
  "angularCompilerOptions": {
    "enableBlockSyntax": true
  }
}
```

---

## 3. Lazy Loading

Every route is lazy-loaded — the initial bundle contains only what's needed to render the login page.

```typescript
// NEVER do this:
import { LeadsListPageComponent } from './features/leads/...';
{ path: 'leads', component: LeadsListPageComponent }

// ALWAYS do this:
{ path: 'leads', loadComponent: () => import('./features/leads/...').then(m => m.LeadsListPageComponent) }
```

---

## 4. trackBy in @for

```html
<!-- WITHOUT trackBy — destroys and recreates all DOM nodes on array change -->
@for (lead of leads(); track lead.id) {
  <app-lead-card [lead]="lead" />
}
```

Always track by a stable unique identifier, never by `$index` unless order is the only thing that matters.

---

## 5. Virtual Scrolling (Large Lists)

For lists exceeding 100 items, use CDK virtual scroll:

```typescript
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  imports: [ScrollingModule],
  template: `
    <cdk-virtual-scroll-viewport itemSize="56" style="height: 500px">
      <app-lead-card
        *cdkVirtualFor="let lead of leads(); trackBy: trackById"
        [lead]="lead"
      />
    </cdk-virtual-scroll-viewport>
  `,
})
export class LeadsListComponent {
  leads = input.required<Lead[]>();
  trackById = (_: number, item: Lead) => item.id;
}
```

---

## 6. Async Pipe vs Manual Subscribe

```html
<!-- WRONG — requires ngOnDestroy to unsubscribe -->
<div>{{ userName }}</div>

<!-- RIGHT — auto-unsubscribes, re-renders only on emission -->
<div>{{ userName$ | async }}</div>

<!-- BEST (Angular 20) — signals, no pipe needed -->
<div>{{ userName() }}</div>
```

---

## 7. Bundle Optimization

```json
// angular.json build options
{
  "optimization": {
    "scripts": true,
    "styles": {
      "minify": true,
      "inlineCritical": true
    },
    "fonts": true
  },
  "sourceMap": false,
  "outputHashing": "all",
  "namedChunks": false
}
```

Analyze bundle size:

```bash
ng build --stats-json
npx webpack-bundle-analyzer dist/my-app/stats.json
```

---

## 8. Preloading Strategy

Preload routes users are likely to visit next:

```typescript
// In app.config.ts
provideRouter(routes, withPreloading(PreloadAllModules))
```

For fine-grained control:

```typescript
// Custom: only preload routes marked { data: { preload: true } }
provideRouter(routes, withPreloading(SelectivePreloadStrategy))
```

---

## 9. Image Optimization

```html
<!-- Use NgOptimizedImage for automatic lazy loading + size hints -->
<img ngSrc="/assets/logo.png" width="200" height="60" priority />
<img ngSrc="{{ lead.avatarUrl }}" width="40" height="40" loading="lazy" />
```

```typescript
import { NgOptimizedImage } from '@angular/common';
// Add to imports array of the component
```

---

## 10. Memoize Expensive Computations

```typescript
// WRONG — recalculates every render cycle
get displayLeads(): Lead[] {
  return this.leads.filter(l => l.status === 'active').sort(...);
}

// RIGHT — computed signal recalculates only when `leads` changes
filteredLeads = computed(() =>
  this.leadService.leads()
    .filter(l => l.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name))
);
```

---

## 11. HTTP Request Deduplication

```typescript
private leads$ = this.http.get<Lead[]>('/leads').pipe(
  shareReplay({ bufferSize: 1, refCount: true }),
);
```

Multiple subscribers get the same response without duplicate requests.

---

## 12. Defer Loading (Angular 17+ `@defer`)

```html
<!-- Load heavy component only when it's scrolled into view -->
@defer (on viewport) {
  <app-analytics-chart [data]="chartData()" />
} @placeholder {
  <div class="chart-placeholder">Loading chart…</div>
} @loading (minimum 200ms) {
  <mat-progress-bar mode="indeterminate" />
}
```

---

## Common Angular Performance Mistakes

| Mistake | Impact | Fix |
|---|---|---|
| Default change detection on dumb components | Entire tree re-renders on any change | `OnPush` everywhere |
| Using `function calls` in templates | Called on every CD cycle | Use `computed()` or pipes |
| No `trackBy` on `@for` | DOM re-created on every array update | Always `track item.id` |
| Subscribing in `ngOnInit` without cleanup | Memory leaks | `takeUntilDestroyed()` |
| Importing entire MUI library | Huge bundle | Import specific modules |
| HTTP calls in `computed()` | Triggers on every read | Keep HTTP in services only |

---

## Performance Budget

Set budgets in `angular.json` to catch regressions in CI:

```json
"budgets": [
  { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
  { "type": "anyComponentStyle", "maximumWarning": "4kb", "maximumError": "8kb" },
  { "type": "anyScript", "maximumWarning": "200kb" }
]
```
