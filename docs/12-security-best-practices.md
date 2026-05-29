# 12 — Security Best Practices

## 1. XSS Prevention

Angular auto-sanitizes bound values in templates. Never disable this.

```html
<!-- SAFE — Angular escapes the value -->
<p>{{ userInput }}</p>
<p [textContent]="userInput"></p>

<!-- DANGEROUS — bypasses sanitization -->
<p [innerHTML]="userInput"></p>  ← Never unless sanitized first
```

When HTML rendering is required:

```typescript
import { DomSanitizer } from '@angular/platform-browser';

@Component({ standalone: true })
export class SafeHtmlComponent {
  private sanitizer = inject(DomSanitizer);
  rawHtml = input.required<string>();

  safeHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.rawHtml()));
}
```

Only use `bypassSecurityTrustHtml` if the source is trusted (your own backend, sanitized server-side).

---

## 2. Content Security Policy (CSP)

Configure in `nginx.conf` or Express response headers:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.myapp.com;
  frame-ancestors 'none';
```

---

## 3. Secure Token Storage

```
Priority (most secure → least):
1. HttpOnly Cookie (browser sends automatically, JS can't read)
2. sessionStorage (cleared on tab close, JS-readable but not persisted)
3. In-memory signal (lost on refresh, most secure from persistence)
4. localStorage — AVOID for tokens (XSS-accessible, persistent)
```

```typescript
// NEVER
localStorage.setItem('token', accessToken);

// ACCEPTABLE for access tokens (short-lived)
sessionStorage.setItem('access_token', accessToken);

// BEST — HttpOnly cookie set by server
// Server response: Set-Cookie: refresh_token=xyz; HttpOnly; Secure; SameSite=Strict
```

---

## 4. Route Protection

Every protected route must have `canActivate`:

```typescript
// ALL authenticated routes — top level
{
  path: '',
  component: ShellComponent,
  canActivate: [authGuard],    // checks token exists
  children: [
    {
      path: 'admin',
      canActivate: [roleGuard(['admin'])],    // checks role
      loadChildren: ...
    }
  ]
}
```

Verify server-side too — never rely solely on client-side guards.

---

## 5. HTTP Security Headers

```typescript
// Set via server (Nginx / Express)
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
```

---

## 6. CSRF Protection

When using cookies for tokens, add CSRF protection:

```typescript
// Angular's HttpClient reads XSRF-TOKEN cookie and sends X-XSRF-TOKEN header automatically
// Enable in app.config.ts:
provideHttpClient(withXsrfConfiguration({
  cookieName: 'XSRF-TOKEN',
  headerName: 'X-XSRF-TOKEN',
}))
```

The backend must:
1. Set `XSRF-TOKEN` cookie on login
2. Verify `X-XSRF-TOKEN` header on state-changing requests

---

## 7. Sensitive Data Handling

```typescript
// NEVER log sensitive data
console.log('User:', user);  // ← may include email, phone
console.log('Token:', token); // ← never log tokens

// NEVER store sensitive data in component state longer than needed
// Clear forms after submit
this.form.reset();

// NEVER put PII in URL params (they appear in server logs)
// WRONG:
router.navigate(['/leads'], { queryParams: { email: user.email } });
// RIGHT:
router.navigate(['/leads'], { queryParams: { userId: user.id } });
```

---

## 8. API Security Integration

```typescript
// Always validate response shapes
function isLead(obj: unknown): obj is Lead {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Lead).id === 'number' &&
    typeof (obj as Lead).name === 'string'
  );
}

// Add integrity checks on critical API responses
this.leadApiService.getLeadById(id).pipe(
  map(response => {
    if (!isLead(response)) throw new Error('Invalid lead data from API');
    return response;
  }),
)
```

---

## 9. Dependency Security

```bash
# Audit dependencies regularly
npm audit

# Fix automatically where safe
npm audit fix

# Check for known vulnerabilities
npx snyk test
```

Add to CI pipeline — fail build on high-severity vulnerabilities.

---

## 10. Environment Variable Security

```typescript
// NEVER put secrets in environment.ts (committed to git)
// environment.ts is bundled into the JS — visible in devtools

// RIGHT — secrets stay on the server
// Frontend environment.ts only contains:
export const environment = {
  apiUrl: 'https://api.myapp.com/v1',   // public
  googleMapsApiKey: 'AIzaSy...',          // OK if domain-restricted
  // NEVER: stripeSecretKey, dbPassword, jwtSecret
};
```

---

## Security Checklist

- [ ] All routes protected with `canActivate`
- [ ] JWT stored in HttpOnly cookie or sessionStorage (never localStorage)
- [ ] Refresh token only in HttpOnly cookie
- [ ] `[innerHTML]` bindings use `DomSanitizer`
- [ ] CSP headers configured
- [ ] CSRF protection enabled for cookie-based auth
- [ ] `npm audit` runs in CI
- [ ] No secrets in `environment.ts`
- [ ] Sensitive data not logged to console
- [ ] PII not in URL query params
- [ ] Security headers set (HSTS, X-Frame-Options, X-Content-Type-Options)
