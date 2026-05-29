# 10 — Error Handling

## Error Handling Layers

```
User Action
    ↓
HTTP Request
    ↓
[ Auth Interceptor ]        — adds token
    ↓
[ Error Interceptor ]       — catches 4xx/5xx, shows toast
    ↓
Feature Service             — can handle domain-specific errors
    ↓
Smart Component             — catches remaining, updates UI state
    ↓
Template                    — renders error state
```

---

## Global Error Handler

Catches all uncaught JavaScript errors:

```typescript
// core/error/global-error.handler.ts
import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';
import { SnackbarService } from '../services/snackbar.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private snackbar = inject(SnackbarService);
  private ngZone = inject(NgZone);

  handleError(error: unknown): void {
    this.ngZone.run(() => {
      const message = this.extractMessage(error);
      console.error('[GlobalError]', error);
      this.snackbar.error('An unexpected error occurred.');

      // Send to logging service
      // this.loggingService.log({ error, url: window.location.href });
    });
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error';
  }
}

// Register in app.config.ts:
{ provide: ErrorHandler, useClass: GlobalErrorHandler }
```

---

## Snackbar (Toast) Service

```typescript
// core/services/snackbar.service.ts
@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private snackbar = inject(MatSnackBar);

  success(message: string, duration = 3000): void {
    this.snackbar.open(message, 'Close', {
      duration,
      panelClass: ['snackbar-success'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  error(message: string, duration = 5000): void {
    this.snackbar.open(message, 'Close', {
      duration,
      panelClass: ['snackbar-error'],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  warning(message: string, duration = 4000): void {
    this.snackbar.open(message, 'Dismiss', {
      duration,
      panelClass: ['snackbar-warning'],
    });
  }
}
```

```scss
// In styles.scss
.snackbar-success .mdc-snackbar__surface { background: #027A48; color: white; }
.snackbar-error   .mdc-snackbar__surface { background: #B42318; color: white; }
.snackbar-warning .mdc-snackbar__surface { background: #B45309; color: white; }
```

---

## Error Boundary Component

```typescript
// shared/components/error-state/error-state.component.ts
@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="error-state">
      <mat-icon class="error-state__icon">error_outline</mat-icon>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      @if (showRetry()) {
        <button mat-raised-button color="primary" (click)="retryClicked.emit()">
          <mat-icon>refresh</mat-icon>
          Try Again
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  title = input('Something went wrong');
  message = input('Please try again or contact support.');
  showRetry = input(true);

  retryClicked = output<void>();
}
```

Usage in a page:

```html
@if (error()) {
  <app-error-state
    [message]="error()"
    (retryClicked)="reloadData()"
  />
} @else if (isLoading()) {
  <app-loading-spinner />
} @else {
  <app-leads-table [leads]="leads()" />
}
```

---

## HTTP-Specific Error Handling

```typescript
// core/http/error.interceptor.ts
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad request. Please check your input.',
  401: 'Session expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. Please refresh and try again.',
  422: 'Validation failed. Please check the form.',
  429: 'Too many requests. Please wait and try again.',
  500: 'Internal server error. Our team has been notified.',
  502: 'Service unavailable. Please try again later.',
  503: 'Service is temporarily down for maintenance.',
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackbar = inject(SnackbarService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 is handled by auth interceptor (refresh logic)
      if (error.status === 401) return throwError(() => error);

      const serverMessage = error.error?.message as string | undefined;
      const fallback = HTTP_ERROR_MESSAGES[error.status] ?? 'An unexpected error occurred.';
      const message = serverMessage ?? fallback;

      if (error.status === 403) {
        router.navigate(['/403']);
      }

      // Don't show toast for 422 (let forms handle field-level errors)
      if (error.status !== 422) {
        snackbar.error(message);
      }

      return throwError(() => error);
    }),
  );
};
```

---

## Feature-Level Error Handling

```typescript
// In feature service
loadLeads(params: LeadSearchDto): void {
  this._isLoading.set(true);
  this._error.set(null);

  this.leadApiService.getLeads(params)
    .pipe(
      finalize(() => this._isLoading.set(false)),
      retry({ count: 2, delay: 1000 }),
    )
    .subscribe({
      next: response => this._leads.set(response.results),
      error: (err: HttpErrorResponse) => {
        // Interceptor already showed toast; just update local error state
        this._error.set(err.error?.message ?? 'Failed to load leads.');
      },
    });
}
```

---

## Fallback UI Pattern

```html
<!-- leads-list-page.component.html -->
<app-page-header title="Leads">
  <ng-container actions>
    <app-button (clicked)="onCreateLead()">New Lead</app-button>
  </ng-container>
</app-page-header>

@if (isLoading()) {
  <app-loading-skeleton rows="10" />
} @else if (error()) {
  <app-error-state [message]="error()" (retryClicked)="reload()" />
} @else if (!leads().length) {
  <app-empty-state
    icon="people"
    title="No leads yet"
    subtitle="Create your first lead to get started."
  />
} @else {
  <app-leads-table [leads]="leads()" />
}
```

---

## Anti-Patterns

| Anti-pattern | Problem |
|---|---|
| `console.log(error)` only | Users see nothing; no recovery path |
| Generic "Something went wrong" always | Users don't know if it's network, auth, or data |
| Swallowing errors with empty `catch {}` | Silent failures are the hardest bugs to diagnose |
| Showing raw server error messages to users | May expose internal implementation details |
| No retry mechanism for network errors | Transient failures cause unnecessary support tickets |
