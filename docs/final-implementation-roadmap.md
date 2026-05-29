# Final Implementation Roadmap

A chronological, phase-by-phase guide for building the application from zero to production.

---

## Phase 1 — Foundation (Week 1)

**Goal**: Working shell, authentication, and routing.

### Day 1–2: Project Setup
- [ ] Install Node 20 via nvm
- [ ] Install Angular CLI 20
- [ ] Scaffold project: `ng new my-app --routing --style=scss --strict --standalone`
- [ ] Install Angular Material: `ng add @angular/material`
- [ ] Install ESLint + Angular ESLint: `ng add @angular-eslint/schematics`
- [ ] Install Prettier + lint rules
- [ ] Configure Husky + lint-staged
- [ ] Set up `tsconfig.json` path aliases (`@core`, `@shared`, `@features`, `@env`)
- [ ] Set up `angular.json` budgets and build config
- [ ] Create folder structure (`core/`, `shared/`, `features/`, `styles/`)
- [ ] Set up SCSS design tokens and variables

### Day 3–4: Core Shell
- [ ] Create `ShellComponent` (grid layout with sidebar + header)
- [ ] Create `HeaderComponent` (title, user avatar, theme toggle)
- [ ] Create `SidebarComponent` (navigation menu, collapsible)
- [ ] Set up `AppState` (global signals for user, theme, sidebar)
- [ ] Wire `app.config.ts` with `provideRouter`, `provideHttpClient`, `provideAnimationsAsync`
- [ ] Set up root routes (`app.routes.ts`) with lazy-loaded feature stubs

### Day 5: Authentication
- [ ] Create `AuthService` (login, logout, refresh, token storage)
- [ ] Create `authInterceptor` (attach token to requests)
- [ ] Create `errorInterceptor` (centralized error handling)
- [ ] Create `authGuard` (protect all shell routes)
- [ ] Build `LoginPageComponent` (reactive form, validation, loading state)
- [ ] Wire `AuthService` to `AppState` on login/logout

**Milestone**: Users can log in, see the shell, and log out.

---

## Phase 2 — Core Infrastructure (Week 2)

**Goal**: API layer, shared components, error handling, state pattern.

### Day 6–7: API Layer
- [ ] Create `ApiService` (get, post, put, patch, delete with base URL)
- [ ] Create `loadingInterceptor` (show/hide global spinner)
- [ ] Add retry operator for network failures
- [ ] Create API endpoint constants
- [ ] Test all interceptors work together

### Day 8: Shared Components
- [ ] `DataTableComponent` (generic, sortable, paginated, with actions)
- [ ] `ConfirmDialogComponent` + `DialogService`
- [ ] `EmptyStateComponent`
- [ ] `ErrorStateComponent`
- [ ] `PageHeaderComponent`
- [ ] `SearchBarComponent` (debounced)
- [ ] `StatusBadgeComponent`
- [ ] `LoadingSkeletonComponent`

### Day 9–10: Error Handling + State Pattern
- [ ] `GlobalErrorHandler` registered in `app.config.ts`
- [ ] `SnackbarService` (success, error, warning wrappers)
- [ ] Establish feature service state pattern (signals + HTTP)
- [ ] Create `UnsavedChangesGuard` for forms
- [ ] Set up custom validators (`phoneValidator`, `passwordMatchValidator`)

**Milestone**: All infrastructure in place. First feature can be built.

---

## Phase 3 — First Feature (Week 3)

**Goal**: Complete lead management CRUD.

### Day 11–12: Leads List
- [ ] Create `leads.routes.ts` with lazy-loaded pages
- [ ] Create `LeadApiService` (getLeads, getById, create, update, delete)
- [ ] Create `LeadService` (state signals + actions)
- [ ] Create `LeadsListPageComponent` (smart, connects service to table)
- [ ] Create `LeadsTableComponent` (dumb, renders leads from input)
- [ ] Add `roleGuard` to leads routes
- [ ] Wire filter, sort, pagination

### Day 13: Lead Detail
- [ ] Create `leadResolver` (prefetch lead by ID)
- [ ] Create `LeadDetailPageComponent`
- [ ] Create `BasicInfoCard`, `ContactInfoCard` dumb components

### Day 14–15: Lead Form (Create/Edit)
- [ ] Create `LeadFormPageComponent` (shared for create + edit)
- [ ] Wire `NonNullableFormBuilder` typed form
- [ ] Server validation error mapping
- [ ] `UnsavedChangesGuard` on edit route
- [ ] Delete with `ConfirmDialogComponent`

**Milestone**: Full CRUD for one feature. Pattern established for all future features.

---

## Phase 4 — Remaining Features (Weeks 4–6)

**Goal**: Build remaining business features using the established pattern.

For each feature:
1. Create `feature.routes.ts`
2. Create `featureApiService` (HTTP methods)
3. Create `featureService` (signals + state)
4. Create smart page components
5. Create dumb display components
6. Wire routing, guards, resolvers

**Features to build** (in priority order):
- [ ] Dashboard (charts, KPIs, recent activity)
- [ ] Settings → Lead Stages configuration
- [ ] Settings → Lead Progress configuration
- [ ] User management (admin only)
- [ ] Reports / analytics

---

## Phase 5 — Quality & Performance (Week 7)

**Goal**: Production-grade performance and quality.

### Performance
- [ ] Verify all dumb components have `OnPush`
- [ ] Add `@defer` to below-fold sections
- [ ] Virtual scroll for large lists
- [ ] Bundle analysis (`npm run analyze`) — fix anything over budget
- [ ] HTTP response caching with `shareReplay` where appropriate
- [ ] Implement `SelectivePreloadStrategy`

### Testing
- [ ] Unit tests for all services (target 80% coverage)
- [ ] Unit tests for all guards and resolvers
- [ ] Component tests for all shared components
- [ ] E2E: Login flow, create lead, edit lead, delete lead
- [ ] Configure coverage threshold in CI

---

## Phase 6 — Security Hardening (Week 8)

- [ ] Audit all `[innerHTML]` usages → add `DomSanitizer`
- [ ] Verify CSP headers in Nginx config
- [ ] Security headers: HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] `npm audit` — resolve all high/critical
- [ ] Verify no secrets in `environment.ts`
- [ ] CSRF protection enabled
- [ ] Run `npx snyk test`

---

## Phase 7 — Deployment & CI/CD (Week 8–9)

- [ ] Write `Dockerfile` (multi-stage: build + nginx)
- [ ] Write `nginx.conf` (routing, gzip, cache headers, security headers)
- [ ] `docker-compose.yml` for local full-stack development
- [ ] GitHub Actions: lint → test → build → push → deploy
- [ ] Separate pipelines for `develop` (staging) and `main` (production)
- [ ] Set up `standard-version` for changelog + version bumping
- [ ] Document rollback procedure

---

## Phase 8 — Documentation & Launch (Week 9–10)

- [ ] Code review pass on all features
- [ ] Performance audit (Lighthouse score > 90)
- [ ] Accessibility audit (aXe or Lighthouse)
- [ ] UAT with stakeholders
- [ ] Production deployment
- [ ] Monitoring setup (error tracking, uptime alerts)

---

## Development Velocity Benchmarks

| Task | Estimated time (after Phase 3) |
|---|---|
| New CRUD feature (simple) | 2–3 days |
| New CRUD feature (complex forms) | 4–5 days |
| New shared component | 2–4 hours |
| Interceptor / guard | 1–2 hours |
| Bug fix (minor) | 1–4 hours |

After Phase 3, each new feature follows the same pattern — velocity increases with each sprint.

---

## Recommended Setup Order

```
1.  Node 20 + Angular CLI
2.  Project scaffold (strict, standalone, scss)
3.  Angular Material
4.  ESLint + Prettier + Husky
5.  tsconfig paths aliases
6.  Folder structure (core, shared, features)
7.  SCSS variables and theme
8.  Environment files (dev, staging, prod)
9.  AppState (global signals)
10. Shell + Layout components
11. Root routing
12. AuthService + interceptors
13. ApiService
14. Shared components (table, dialog, empty state)
15. Error handling (global handler, snackbar)
16. First feature (full CRUD)
17. Testing setup
18. Docker + Nginx
19. CI/CD pipeline
20. Remaining features
```

---

## Debugging Recommendations

1. **Angular DevTools** browser extension — inspect change detection, signals, component tree
2. **Network tab** — verify interceptors attach the token correctly
3. **`console.warn` only** — never `console.log` in committed code
4. Use `ng serve --source-map` to get readable stack traces
5. `ng build --stats-json && npx webpack-bundle-analyzer dist/stats.json` — bundle bloat debugging
6. `ng lint` before every commit (Husky enforces it)

---

## Scalability Bottlenecks to Watch

| Bottleneck | When it appears | Mitigation |
|---|---|---|
| Bundle size growth | 20+ features | Code splitting + lazy loading (enforced by budgets) |
| Change detection cycles | 50+ components on page | `OnPush` everywhere + signals |
| State management complexity | 10+ cross-feature signals | Consider NgRx signals store |
| Build time | Large codebase | Nx workspace with affected builds |
| Test execution time | 500+ unit tests | Parallel test execution + selective E2E |

---

## Common Mistakes to Avoid

1. **Skipping `OnPush`** — performance degrades silently
2. **Feature imports across boundaries** — creates circular deps at scale
3. **Logic in templates** — untestable and unreadable
4. **JWT in localStorage** — XSS vulnerability
5. **No error handling on HTTP** — users see blank screens
6. **Skipping strict TypeScript** — `any` types proliferate and hide bugs
7. **One giant service with all feature logic** — untestable and unsplittable
8. **Not using `takeUntilDestroyed`** — memory leaks that are hard to detect
9. **Manual subscriptions in templates** — use `async` pipe or signals
10. **Hardcoded strings** — use constants and enums

---

## Maintainability Score Checklist

Rate your codebase:

- [ ] All dumb components have `OnPush`
- [ ] All observables unsubscribed properly
- [ ] No `any` types (ESLint enforced)
- [ ] No cross-feature imports
- [ ] All API calls go through `ApiService`
- [ ] Unit test coverage ≥ 80%
- [ ] Bundle size within budget
- [ ] All routes lazy-loaded
- [ ] Linting passes in CI
- [ ] `npm audit` shows 0 high/critical
