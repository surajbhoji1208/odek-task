# 06 — Authentication & Authorization

## JWT Flow

```
1. User submits login form
2. POST /auth/login → { accessToken, refreshToken }
3. Store tokens securely
4. Attach accessToken to every API request (via interceptor)
5. On 401 → use refreshToken to get new accessToken
6. On refresh failure → logout → redirect to /auth/login
```

---

## Token Storage Strategy

| Method | XSS Safe | CSRF Safe | Notes |
|---|---|---|---|
| `localStorage` | ❌ No | ✅ Yes | Accessible to JS — XSS risk |
| `sessionStorage` | ❌ No | ✅ Yes | Cleared on tab close |
| **HttpOnly Cookie** | ✅ Yes | ❌ No (needs CSRF token) | **Recommended** |
| Memory (JS variable) | ✅ Yes | ✅ Yes | Lost on refresh |

**Recommended**: HttpOnly cookies (backend sets them, browser sends them automatically). If HttpOnly cookies aren't available, use `sessionStorage` + a short-lived token lifetime.

---

## AuthService

```typescript
// core/auth/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private appState = inject(AppState);

  // #region State

  private _isRefreshing = signal(false);
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  isAuthenticated = computed(() => this.appState.currentUser() !== null);
  currentUser = this.appState.currentUser;

  // #endregion

  // #region Auth Actions

  login(credentials: LoginDto): Observable<void> {
    return this.http.post<AuthResponse>('/auth/login', credentials).pipe(
      tap(response => this.handleAuthSuccess(response)),
      map(() => void 0),
    );
  }

  logout(): void {
    this.http.post('/auth/logout', {}).subscribe();
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<string> {
    if (this._isRefreshing()) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        map(token => token as string),
      );
    }

    this._isRefreshing.set(true);
    this.refreshTokenSubject.next(null);

    return this.http.post<AuthResponse>('/auth/refresh', {}).pipe(
      tap(response => {
        this._isRefreshing.set(false);
        this.storeToken(response.accessToken);
        this.refreshTokenSubject.next(response.accessToken);
      }),
      map(response => response.accessToken),
      catchError(error => {
        this._isRefreshing.set(false);
        this.clearSession();
        this.router.navigate(['/auth/login']);
        return throwError(() => error);
      }),
    );
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem('access_token');
  }

  // #endregion

  // #region Private Helpers

  private handleAuthSuccess(response: AuthResponse): void {
    this.storeToken(response.accessToken);
    this.appState.setCurrentUser(response.user);
  }

  private storeToken(token: string): void {
    sessionStorage.setItem('access_token', token);
  }

  private clearSession(): void {
    sessionStorage.removeItem('access_token');
    this.appState.setCurrentUser(null);
  }

  // #endregion
}
```

---

## Auth Interceptor (Functional)

```typescript
// core/auth/auth.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError(error => {
      if (error.status === 401 && !req.url.includes('/auth/refresh')) {
        return handle401(req, next, authService);
      }
      return throwError(() => error);
    }),
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
) {
  return authService.refreshToken().pipe(
    switchMap(newToken => next(addToken(req, newToken))),
  );
}
```

---

## Login Component

```typescript
// features/auth/pages/login-page/login-page.component.ts
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterLink],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-form-field>
        <mat-label>Email</mat-label>
        <input matInput formControlName="email" type="email" autocomplete="email" />
        <mat-error>{{ emailError() }}</mat-error>
      </mat-form-field>

      <mat-form-field>
        <mat-label>Password</mat-label>
        <input matInput formControlName="password" [type]="showPassword() ? 'text' : 'password'" />
        <button matSuffix mat-icon-button type="button" (click)="togglePassword()">
          <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
      </mat-form-field>

      <button mat-raised-button color="primary" type="submit" [disabled]="isLoading()">
        @if (isLoading()) { Signing in... } @else { Sign In }
      </button>

      @if (error()) {
        <mat-error>{{ error() }}</mat-error>
      }
    </form>
  `,
})
export class LoginPageComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
  });

  isLoading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);

  emailError = computed(() => {
    const ctrl = this.form.controls.email;
    if (ctrl.hasError('required')) return 'Email is required';
    if (ctrl.hasError('email')) return 'Enter a valid email';
    return '';
  });

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.authService.login(this.form.getRawValue() as LoginDto).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: err => {
        this.error.set(err.error?.message ?? 'Login failed. Please try again.');
        this.isLoading.set(false);
      },
    });
  }
}
```

---

## Role-Based Access Control

```typescript
// core/auth/models/user.model.ts
export type UserRole = 'admin' | 'manager' | 'agent';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}
```

```typescript
// core/auth/permissions.ts
export const PERMISSIONS: Record<string, UserRole[]> = {
  'leads:view': ['admin', 'manager', 'agent'],
  'leads:create': ['admin', 'manager'],
  'leads:delete': ['admin'],
  'settings:view': ['admin'],
};

// Usage in components
@Component({ standalone: true })
export class LeadActionsComponent {
  private authService = inject(AuthService);

  canDelete = computed(() => {
    const role = this.authService.currentUser()?.role;
    return role === 'admin';
  });
}
```

```html
<!-- Template permission check -->
@if (canDelete()) {
  <button mat-icon-button color="warn" (click)="onDelete()">
    <mat-icon>delete</mat-icon>
  </button>
}
```

---

## Security Risks & Anti-Patterns

| Risk | Anti-pattern | Fix |
|---|---|---|
| XSS token theft | Storing JWT in `localStorage` | Use HttpOnly cookies or sessionStorage |
| CSRF attacks | No CSRF token with cookies | Include CSRF token header |
| Token expiry ignored | No refresh logic | Implement refresh interceptor |
| Roles hardcoded in templates | `*ngIf="role === 'admin'"` | Use permission constants |
| Refresh token in `localStorage` | Any JS can steal it | Refresh token must be HttpOnly cookie only |
