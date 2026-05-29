# 07 — API Layer Architecture

## Design Goals

1. All HTTP calls go through `ApiService` — not raw `HttpClient`
2. Typed request/response with generics
3. Centralized base URL via environment config
4. Interceptors handle cross-cutting (auth, errors, loading)
5. Retry logic for transient failures
6. Repository pattern per feature

---

## ApiService (Base HTTP Wrapper)

```typescript
// core/http/api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

type QueryParams = Record<string, string | number | boolean | null | undefined>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  get<T>(path: string, query?: QueryParams): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      params: this.buildParams(query),
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body);
  }

  delete<T = void>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`);
  }

  private buildParams(query?: QueryParams): HttpParams {
    let params = new HttpParams();
    if (!query) return params;

    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params = params.set(key, String(value));
      }
    });

    return params;
  }
}
```

---

## Feature Repository Pattern

Each feature has its own service that wraps `ApiService` with domain-specific methods.

```typescript
// features/leads/services/lead-api.service.ts
@Injectable({ providedIn: 'root' })
export class LeadApiService {
  private api = inject(ApiService);

  getLeads(params: LeadSearchDto): Observable<PaginatedResponse<Lead>> {
    return this.api.get<PaginatedResponse<Lead>>('/leads', params);
  }

  getLeadById(id: number): Observable<Lead> {
    return this.api.get<Lead>(`/leads/${id}`);
  }

  createLead(dto: CreateLeadDto): Observable<Lead> {
    return this.api.post<Lead>('/leads', dto);
  }

  updateLead(id: number, dto: UpdateLeadDto): Observable<Lead> {
    return this.api.put<Lead>(`/leads/${id}`, dto);
  }

  deleteLead(id: number): Observable<void> {
    return this.api.delete(`/leads/${id}`);
  }

  assignLead(id: number, userId: number): Observable<Lead> {
    return this.api.patch<Lead>(`/leads/${id}/assign`, { userId });
  }
}
```

---

## API Response Typing (DTOs)

```typescript
// shared/models/api-response.model.ts

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// features/leads/models/lead.model.ts
export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  assignedTo: number | null;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

// DTOs (what we SEND to the API)
export interface CreateLeadDto {
  name: string;
  email: string;
  phone: string;
}

export interface UpdateLeadDto extends Partial<CreateLeadDto> {}

export interface LeadSearchDto {
  searchText?: string;
  status?: LeadStatus;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}
```

---

## Error Interceptor (Functional)

```typescript
// core/http/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SnackbarService } from '../services/snackbar.service';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackbar = inject(SnackbarService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = extractErrorMessage(error);

      switch (error.status) {
        case 400:
          snackbar.error(message || 'Invalid request.');
          break;
        case 403:
          snackbar.error('You do not have permission.');
          router.navigate(['/403']);
          break;
        case 404:
          snackbar.error('Resource not found.');
          break;
        case 422:
          // Validation errors — let the component handle them
          break;
        case 500:
          snackbar.error('Server error. Please try again later.');
          break;
        default:
          if (!navigator.onLine) {
            snackbar.error('No internet connection.');
          }
      }

      return throwError(() => error);
    }),
  );
};

function extractErrorMessage(error: HttpErrorResponse): string {
  return (
    error.error?.message ??
    error.error?.error ??
    error.message ??
    'An unexpected error occurred.'
  );
}
```

---

## Loading Interceptor

```typescript
// core/http/loading.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Skip loading indicator for background requests
  if (req.headers.has('X-Skip-Loading')) {
    return next(req);
  }

  loadingService.show();

  return next(req).pipe(finalize(() => loadingService.hide()));
};
```

```typescript
// core/services/loading.service.ts
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeRequests = signal(0);
  isLoading = computed(() => this.activeRequests() > 0);

  show(): void { this.activeRequests.update(n => n + 1); }
  hide(): void { this.activeRequests.update(n => Math.max(0, n - 1)); }
}
```

---

## Retry Strategy

```typescript
// core/http/retry.operator.ts
import { retry, timer } from 'rxjs';

export function withRetry(maxRetries = 3, delayMs = 1000) {
  return retry({
    count: maxRetries,
    delay: (error, retryCount) => {
      // Only retry on network errors and 5xx
      if (error.status && error.status < 500) {
        throw error;
      }
      return timer(delayMs * retryCount);
    },
  });
}

// Usage in feature service
getLeads(): Observable<Lead[]> {
  return this.api.get<Lead[]>('/leads').pipe(withRetry(3, 500));
}
```

---

## Environment-Based API URLs

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1',
};

// environments/environment.production.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.myapp.com/v1',
};
```

---

## API Endpoint Constants

```typescript
// core/http/api-endpoints.ts
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  LEADS: {
    BASE: '/leads',
    BY_ID: (id: number) => `/leads/${id}`,
    ASSIGN: (id: number) => `/leads/${id}/assign`,
  },
  SETTINGS: {
    STAGES: '/settings/lead-stages',
    PROGRESS: '/settings/lead-progress',
  },
} as const;
```

---

## Anti-Patterns

| Anti-pattern | Problem |
|---|---|
| Calling `HttpClient` directly in components | Bypasses interceptors, untestable |
| Returning `any` from API services | Breaks type safety throughout the app |
| Hardcoded base URLs in services | Environment switching is manual and error-prone |
| No error handling — letting errors bubble unhandled | Users see browser error screens |
| Making the same API call in 3 different components | No caching, no deduplication |
