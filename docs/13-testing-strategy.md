# 13 — Testing Strategy

## Testing Pyramid

```
         ┌─────────────────┐
         │   E2E (Cypress) │  ← Few, cover critical user flows
         └────────┬────────┘
      ┌───────────┴───────────┐
      │  Integration Tests    │  ← Components with real services
      └───────────┬───────────┘
  ┌───────────────┴───────────────┐
  │         Unit Tests            │  ← Services, pipes, utils, guards
  └───────────────────────────────┘
```

**Rule**: 70% unit, 20% integration, 10% E2E.

---

## Unit Testing — Services

```typescript
// features/leads/services/lead.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LeadService } from './lead.service';
import { environment } from '@env/environment';

describe('LeadService', () => {
  let service: LeadService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LeadService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(LeadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should load leads', () => {
    const mockLeads: Lead[] = [
      { id: 1, name: 'Alice', email: 'alice@test.com', status: 'new' }
    ];

    service.loadLeads({});

    expect(service.isLoading()).toBe(true);

    const req = http.expectOne(`${environment.apiUrl}/leads`);
    expect(req.request.method).toBe('GET');
    req.flush({ results: mockLeads, totalCount: 1 });

    expect(service.isLoading()).toBe(false);
    expect(service.leads()).toEqual(mockLeads);
  });

  it('should handle load error', () => {
    service.loadLeads({});

    const req = http.expectOne(`${environment.apiUrl}/leads`);
    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Error' });

    expect(service.isLoading()).toBe(false);
    expect(service.error()).toBe('Server error');
  });
});
```

---

## Unit Testing — Guards

```typescript
// core/auth/auth.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let router: Router;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['isAuthenticated']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: { createUrlTree: jasmine.createSpy().and.returnValue('/auth/login') } },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('should allow access when authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('should redirect when not authenticated', () => {
    authService.isAuthenticated.and.returnValue(false);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login'], jasmine.any(Object));
  });
});
```

---

## Unit Testing — Pipes

```typescript
// shared/pipes/date-format.pipe.spec.ts
import { DateFormatPipe } from './date-format.pipe';

describe('DateFormatPipe', () => {
  const pipe = new DateFormatPipe();

  it('should format ISO date to display format', () => {
    expect(pipe.transform('2024-01-15T00:00:00Z')).toBe('Jan 15, 2024');
  });

  it('should return "—" for null/undefined', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
  });
});
```

---

## Component Testing

```typescript
// features/leads/components/leads-table.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeadsTableComponent } from './leads-table.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('LeadsTableComponent', () => {
  let component: LeadsTableComponent;
  let fixture: ComponentFixture<LeadsTableComponent>;

  const mockLeads: Lead[] = [
    { id: 1, name: 'Alice', email: 'alice@test.com', status: 'new' },
    { id: 2, name: 'Bob', email: 'bob@test.com', status: 'contacted' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeadsTableComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(LeadsTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('leads', mockLeads);
    fixture.detectChanges();
  });

  it('should render correct number of rows', () => {
    const rows = fixture.debugElement.queryAll(By.css('mat-row'));
    expect(rows.length).toBe(2);
  });

  it('should emit editClicked when edit button clicked', () => {
    const emitted: number[] = [];
    component.editClicked.subscribe(id => emitted.push(id));

    const editBtn = fixture.debugElement.query(By.css('[data-testid="edit-btn"]'));
    editBtn.triggerEventHandler('click', null);

    expect(emitted).toEqual([1]);
  });
});
```

---

## Mocking Services

```typescript
// Mock service for component tests
const mockLeadService: Partial<LeadService> = {
  leads: signal([{ id: 1, name: 'Alice' } as Lead]),
  isLoading: signal(false),
  error: signal(null),
  loadLeads: jasmine.createSpy(),
};

TestBed.configureTestingModule({
  providers: [
    { provide: LeadService, useValue: mockLeadService },
  ],
});
```

---

## Interceptor Testing

```typescript
// core/auth/auth.interceptor.spec.ts
describe('authInterceptor', () => {
  it('should attach Bearer token to requests', () => {
    const authService = { getAccessToken: () => 'test-token' };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });

    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);

    http.get('/test').subscribe();

    const req = controller.expectOne('/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    controller.verify();
  });
});
```

---

## E2E Testing with Cypress

```bash
npm install --save-dev cypress
npx cypress open
```

```typescript
// cypress/e2e/auth/login.cy.ts
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/auth/login');
  });

  it('should log in successfully with valid credentials', () => {
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: { accessToken: 'mock-token', user: { id: 1, role: 'admin' } },
    }).as('login');

    cy.get('[data-testid="email-input"]').type('admin@test.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-btn"]').click();

    cy.wait('@login');
    cy.url().should('include', '/dashboard');
  });

  it('should show error on invalid credentials', () => {
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 401,
      body: { message: 'Invalid credentials' },
    });

    cy.get('[data-testid="email-input"]').type('wrong@test.com');
    cy.get('[data-testid="password-input"]').type('wrongpass');
    cy.get('[data-testid="login-btn"]').click();

    cy.contains('Invalid credentials').should('be.visible');
  });
});
```

---

## Test Coverage Configuration

```json
// karma.conf.js coverage threshold
coverageReporter: {
  type: 'html',
  subdir: '.',
  check: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
}
```

Run coverage:

```bash
ng test --code-coverage
```

---

## Anti-Patterns

| Anti-pattern | Problem |
|---|---|
| Testing implementation details | Tests break on refactor, not on regressions |
| No `afterEach(() => http.verify())` | Unmatched HTTP requests leak across tests |
| Mocking everything | Integration value is lost |
| E2E tests for every edge case | Slow CI; use unit tests for edge cases |
| `fixture.detectChanges()` in every `it` | Call once in `beforeEach` |
