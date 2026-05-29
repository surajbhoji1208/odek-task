# 17 — Environment Management

## Environment Files

```typescript
// src/environments/environment.ts (development)
export const environment = {
  production: false,
  staging: false,
  apiUrl: 'http://localhost:3000/api/v1',
  appVersion: '1.0.0-dev',
  logLevel: 'debug',
  featureFlags: {
    enableAnalytics: false,
    enableDarkMode: true,
  },
};

// src/environments/environment.staging.ts
export const environment = {
  production: false,
  staging: true,
  apiUrl: 'https://staging-api.myapp.com/v1',
  appVersion: '1.0.0-staging',
  logLevel: 'warn',
  featureFlags: {
    enableAnalytics: true,
    enableDarkMode: true,
  },
};

// src/environments/environment.production.ts
export const environment = {
  production: true,
  staging: false,
  apiUrl: 'https://api.myapp.com/v1',
  appVersion: '1.0.0',
  logLevel: 'error',
  featureFlags: {
    enableAnalytics: true,
    enableDarkMode: false,
  },
};
```

---

## Type-Safe Environment Model

```typescript
// src/environments/environment.model.ts
export interface Environment {
  production: boolean;
  staging: boolean;
  apiUrl: string;
  appVersion: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  featureFlags: {
    enableAnalytics: boolean;
    enableDarkMode: boolean;
  };
}
```

---

## angular.json — File Replacements

```json
"configurations": {
  "production": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.production.ts"
      }
    ]
  },
  "staging": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.staging.ts"
      }
    ]
  }
}
```

---

## EnvironmentService

Wraps environment config as an injectable:

```typescript
// core/services/environment.service.ts
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import type { Environment } from '@env/environment.model';

@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  private config: Environment = environment;

  get apiUrl(): string { return this.config.apiUrl; }
  get isProduction(): boolean { return this.config.production; }
  get version(): string { return this.config.appVersion; }
  get logLevel(): string { return this.config.logLevel; }
  isFeatureEnabled(flag: keyof Environment['featureFlags']): boolean {
    return this.config.featureFlags[flag];
  }
}
```

Usage:

```typescript
private env = inject(EnvironmentService);

ngOnInit(): void {
  if (this.env.isFeatureEnabled('enableAnalytics')) {
    this.analyticsService.init();
  }
}
```

---

## Runtime Configuration (Server-Injected)

For Docker/Kubernetes where environment differs at runtime, not build time:

```typescript
// src/assets/config/app.config.json (served as static asset)
{
  "apiUrl": "https://api.myapp.com/v1",
  "version": "1.2.0"
}

// core/services/runtime-config.service.ts
export interface RuntimeConfig {
  apiUrl: string;
  version: string;
}

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private config = signal<RuntimeConfig | null>(null);

  loadConfig(): Promise<void> {
    return fetch('/assets/config/app.config.json')
      .then(res => res.json())
      .then((cfg: RuntimeConfig) => this.config.set(cfg));
  }

  get apiUrl(): string {
    return this.config()?.apiUrl ?? environment.apiUrl;
  }
}

// Load before app bootstraps in main.ts:
fetch('/assets/config/app.config.json')
  .then(res => res.json())
  .then(config => {
    bootstrapApplication(AppComponent, {
      ...appConfig,
      providers: [
        ...appConfig.providers,
        { provide: RUNTIME_CONFIG, useValue: config },
      ],
    });
  });
```

This allows different `app.config.json` per Docker environment without rebuilding the image.

---

## Secret Handling

**NEVER** store secrets in environment files — they are bundled into JavaScript.

| Type | Where it lives |
|---|---|
| API URL | `environment.ts` ✅ |
| Public API key (e.g., Google Maps) | `environment.ts` ✅ (domain-restrict it) |
| JWT secret | Server only ❌ never in frontend |
| Database credentials | Server only ❌ |
| Stripe publishable key | `environment.ts` ✅ |
| Stripe secret key | Server only ❌ |

---

## .gitignore for Environments

```gitignore
# Never commit production env files with secrets
src/environments/environment.production.ts
src/environments/environment.staging.ts

# Use .example files instead
# src/environments/environment.production.example.ts
```

---

## Feature Flags

```typescript
// Toggle features without redeployment
@Component({ standalone: true })
export class AppNavComponent {
  private env = inject(EnvironmentService);

  showAnalytics = computed(() => this.env.isFeatureEnabled('enableAnalytics'));
}
```

```html
@if (showAnalytics()) {
  <app-analytics-widget />
}
```

---

## Versioning Display

```typescript
// Show app version in footer or about page
@Component({ template: `<small>v{{ version }}</small>` })
export class FooterComponent {
  version = inject(EnvironmentService).version;
}
```
