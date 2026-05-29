# 02 — Folder Structure

## Philosophy

Enterprise Angular applications fail structurally when files are organized by type (`components/`, `services/`, `pipes/`). Scale demands **feature-first** organization — each domain owns its files. Cross-cutting concerns live in `core/` and `shared/`.

---

## Full Structure

```
src/
├── app/
│   ├── core/                          # Singleton services, guards, interceptors
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.guard.ts
│   │   │   ├── auth.interceptor.ts
│   │   │   └── models/
│   │   │       ├── user.model.ts
│   │   │       └── token.model.ts
│   │   ├── http/
│   │   │   ├── api.service.ts
│   │   │   ├── error.interceptor.ts
│   │   │   └── loading.interceptor.ts
│   │   ├── layout/
│   │   │   ├── shell/
│   │   │   │   ├── shell.component.ts
│   │   │   │   └── shell.component.html
│   │   │   ├── header/
│   │   │   ├── sidebar/
│   │   │   └── footer/
│   │   ├── store/                     # Global signals / state
│   │   │   └── app.state.ts
│   │   └── utils/
│   │       ├── date.util.ts
│   │       └── string.util.ts
│   │
│   ├── shared/                        # Reusable dumb components, pipes, directives
│   │   ├── components/
│   │   │   ├── button/
│   │   │   ├── dialog/
│   │   │   ├── data-table/
│   │   │   ├── form-field/
│   │   │   └── page-header/
│   │   ├── directives/
│   │   │   ├── click-outside.directive.ts
│   │   │   └── debounce-click.directive.ts
│   │   ├── pipes/
│   │   │   ├── date-format.pipe.ts
│   │   │   └── truncate.pipe.ts
│   │   ├── validators/
│   │   │   ├── email.validator.ts
│   │   │   └── password-match.validator.ts
│   │   └── models/
│   │       ├── api-response.model.ts
│   │       ├── pagination.model.ts
│   │       └── select-option.model.ts
│   │
│   ├── features/                      # Feature modules (lazy-loaded)
│   │   ├── dashboard/
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── pages/
│   │   │   │   └── dashboard-page/
│   │   │   │       ├── dashboard-page.component.ts
│   │   │   │       └── dashboard-page.component.html
│   │   │   ├── components/            # Dumb components for this feature
│   │   │   ├── services/
│   │   │   │   └── dashboard.service.ts
│   │   │   ├── store/
│   │   │   │   └── dashboard.state.ts
│   │   │   └── models/
│   │   │       └── dashboard.model.ts
│   │   │
│   │   ├── leads/
│   │   │   ├── leads.routes.ts
│   │   │   ├── pages/
│   │   │   │   ├── leads-list-page/
│   │   │   │   ├── lead-detail-page/
│   │   │   │   └── lead-form-page/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   └── models/
│   │   │
│   │   └── settings/
│   │       ├── settings.routes.ts
│   │       ├── pages/
│   │       ├── components/
│   │       └── services/
│   │
│   ├── app.component.ts
│   ├── app.component.html
│   ├── app.config.ts                  # Root providers (Angular 20 standalone)
│   └── app.routes.ts                  # Root routes
│
├── assets/
│   ├── icons/
│   ├── images/
│   ├── fonts/
│   └── i18n/
│
├── environments/
│   ├── environment.ts
│   └── environment.production.ts
│
└── styles/
    ├── _variables.scss
    ├── _typography.scss
    ├── _mixins.scss
    ├── _breakpoints.scss
    ├── _reset.scss
    └── styles.scss                    # Global entry point
```

---

## Folder Responsibilities

### `core/`

**Purpose**: Application-wide singletons that are provided once and shared everywhere.

**Contains**:
- `AuthService` — JWT management, login/logout
- `ApiService` — base HTTP wrapper
- Interceptors — auth headers, error handling, loading
- Layout components — shell, header, sidebar
- Global state signals

**Rules**:
- Never import from `features/`
- Never import from `shared/`
- Provided in `app.config.ts` root providers

---

### `shared/`

**Purpose**: Reusable UI and logic that multiple features consume, but which has no business logic of its own.

**Contains**:
- Presentational components (DataTable, Dialog, FormField)
- Pipes (`DateFormatPipe`, `TruncatePipe`)
- Directives (`ClickOutsideDirective`)
- Validators
- Shared model interfaces

**Rules**:
- Components must be **dumb** — accept inputs, emit outputs
- Must not call any API
- Must not import from `features/` or `core/`

---

### `features/`

**Purpose**: Each business domain in its own isolated directory.

**Each feature owns**:
- Its routes (`feature.routes.ts`)
- Its page-level smart components (`pages/`)
- Its dumb display components (`components/`)
- Its data services (`services/`)
- Its local state (`store/`)
- Its data models (`models/`)

**Rules**:
- Features do not import from other features directly
- Cross-feature communication goes through `core/store/` signals
- Always lazy-loaded from `app.routes.ts`

---

### `assets/`

**Purpose**: Static files served as-is.

**Rules**:
- Icons: prefer SVG inline or Angular Material icons
- Images: use next-gen formats (WebP/AVIF) where possible
- No TypeScript here

---

### `environments/`

**Purpose**: Build-time environment configuration.

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  tokenKey: 'auth_token',
  version: '1.0.0',
};
```

---

### `styles/`

**Purpose**: Global SCSS — variables, mixins, typography, resets.

```scss
// styles.scss
@use 'variables' as *;
@use 'typography';
@use 'reset';
@use 'mixins' as *;

// Angular Material theme import
@use '@angular/material' as mat;
@include mat.all-component-themes($app-theme);
```

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | `kebab-case` | `lead-detail.component.ts` |
| Classes | `PascalCase` | `LeadDetailComponent` |
| Interfaces | `PascalCase` + `I` prefix (optional) | `LeadModel` |
| Services | `kebab-case.service.ts` | `lead.service.ts` |
| Guards | `kebab-case.guard.ts` | `auth.guard.ts` |
| Interceptors | `kebab-case.interceptor.ts` | `auth.interceptor.ts` |
| Signals | `camelCase` | `currentUser` |
| Constants | `UPPER_SNAKE_CASE` | `API_ENDPOINTS` |

---

## What NOT to Put Where

| Anti-pattern | Why it breaks |
|---|---|
| API calls in shared components | Tight coupling, breaks reusability |
| Business logic in core/layout | Layout is presentation only |
| Feature-specific models in shared/ | Pollutes shared namespace |
| God service with 50+ methods | Impossible to test or tree-shake |
| Circular feature imports | Compilation errors at scale |

---

## Scalability Recommendation

When a feature grows beyond 5 pages, split it into sub-features:

```
features/
└── leads/
    ├── leads.routes.ts
    ├── lead-list/          # Sub-feature
    ├── lead-detail/        # Sub-feature
    └── lead-form/          # Sub-feature
```

Each sub-feature has its own `pages/`, `components/`, `services/`, and optionally its own routes that are referenced by `leads.routes.ts`.
