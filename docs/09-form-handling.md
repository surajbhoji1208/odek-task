# 09 — Form Handling

## Reactive Forms (Angular 20 Standard)

Always use Reactive Forms — never Template-Driven Forms in enterprise apps.

**Why**: Reactive forms are synchronously testable, type-safe, and imperative.

---

## Typed Form Pattern

```typescript
import { FormControl, FormGroup, Validators, NonNullableFormBuilder } from '@angular/forms';

// features/leads/models/lead-form.model.ts
export interface LeadFormValues {
  name: string;
  email: string;
  phone: string;
  stageId: number | null;
}

// Component
@Component({ standalone: true, imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule] })
export class LeadFormPageComponent {
  private fb = inject(NonNullableFormBuilder);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
    stageId: this.fb.control<number | null>(null),
  });

  // Typed getters for template
  get nameCtrl() { return this.form.controls.name; }
  get emailCtrl() { return this.form.controls.email; }
}
```

`NonNullableFormBuilder` makes all controls non-nullable by default — prevents `| null` types on `.value`.

---

## Reusable Error Message Component

```typescript
// shared/components/form-field-error/form-field-error.component.ts
@Component({
  selector: 'app-form-error',
  standalone: true,
  template: `
    @if (control() && control().invalid && (control().dirty || control().touched)) {
      @if (control().hasError('required')) {
        <span class="error">{{ label() }} is required.</span>
      } @else if (control().hasError('email')) {
        <span class="error">Enter a valid email address.</span>
      } @else if (control().hasError('minlength')) {
        <span class="error">
          Minimum {{ control().getError('minlength').requiredLength }} characters.
        </span>
      } @else if (control().hasError('maxlength')) {
        <span class="error">
          Maximum {{ control().getError('maxlength').requiredLength }} characters.
        </span>
      } @else if (control().hasError('pattern')) {
        <span class="error">Invalid format.</span>
      } @else if (control().errors | keyvalue; as errors) {
        <span class="error">{{ errors[0].value?.message ?? 'Invalid value.' }}</span>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormErrorComponent {
  control = input.required<AbstractControl>();
  label = input('This field');
}
```

Usage:

```html
<mat-form-field>
  <mat-label>Email</mat-label>
  <input matInput formControlName="email" />
  <mat-error>
    <app-form-error [control]="emailCtrl" label="Email" />
  </mat-error>
</mat-form-field>
```

---

## Custom Validators

```typescript
// shared/validators/password-match.validator.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) return null;

  return password.value !== confirmPassword.value
    ? { passwordMismatch: true }
    : null;
};

// shared/validators/phone.validator.ts
export const phoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value as string;
  if (!value) return null;
  const valid = /^\+?[0-9]{10,15}$/.test(value);
  return valid ? null : { invalidPhone: { message: 'Enter a valid phone number.' } };
};
```

---

## Async Validators (Server-side uniqueness check)

```typescript
// shared/validators/unique-email.validator.ts
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { debounceTime, map, catchError, switchMap } from 'rxjs/operators';

export function uniqueEmailValidator(
  authService: AuthService,
  currentEmail?: string,
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value || control.value === currentEmail) {
      return of(null);
    }

    return of(control.value).pipe(
      debounceTime(400),
      switchMap(email => authService.checkEmailAvailability(email)),
      map(available => (available ? null : { emailTaken: true })),
      catchError(() => of(null)),
    );
  };
}

// Usage
email: ['', [Validators.required, Validators.email], [uniqueEmailValidator(authService)]]
```

---

## Dynamic Form Arrays

```typescript
// For managing a list of dynamic items (e.g., time-based rules)
@Component({ standalone: true, imports: [ReactiveFormsModule, MatButtonModule] })
export class TimeBasedRulesFormComponent {
  private fb = inject(NonNullableFormBuilder);

  form = this.fb.group({
    rules: this.fb.array([this.createRule()]),
  });

  get rules() {
    return this.form.controls.rules;
  }

  createRule() {
    return this.fb.group({
      label: ['', [Validators.required]],
      startMin: [0, [Validators.required, Validators.min(0)]],
      endMin: [60, [Validators.required, Validators.min(1)]],
      points: [10, [Validators.required]],
    });
  }

  addRule(): void {
    this.rules.push(this.createRule());
  }

  removeRule(index: number): void {
    this.rules.removeAt(index);
  }
}
```

```html
<form [formGroup]="form">
  <div formArrayName="rules">
    @for (rule of rules.controls; track $index; let i = $index) {
      <div [formGroupName]="i" class="rule-row">
        <input formControlName="label" placeholder="Label" />
        <input formControlName="startMin" type="number" placeholder="Start (min)" />
        <input formControlName="endMin" type="number" placeholder="End (min)" />
        <input formControlName="points" type="number" placeholder="Points" />
        <button mat-icon-button type="button" (click)="removeRule(i)">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    }
  </div>
  <button mat-button type="button" (click)="addRule()">+ Add Rule</button>
</form>
```

---

## Form Submission Pattern

```typescript
onSubmit(): void {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  this.isSubmitting.set(true);

  const dto: CreateLeadDto = this.form.getRawValue();

  this.leadService.createLead(dto).subscribe({
    next: () => {
      this.snackbar.success('Lead created successfully.');
      this.router.navigate(['/leads']);
    },
    error: (err: HttpErrorResponse) => {
      // Handle server validation errors
      if (err.status === 422 && err.error.errors) {
        this.applyServerErrors(err.error.errors);
      }
      this.isSubmitting.set(false);
    },
  });
}

private applyServerErrors(errors: Record<string, string>): void {
  Object.entries(errors).forEach(([field, message]) => {
    const control = this.form.get(field);
    if (control) {
      control.setErrors({ serverError: { message } });
    }
  });
}
```

---

## Form State Guard (Unsaved Changes)

```typescript
// core/guards/unsaved-changes.guard.ts
import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = component => {
  if (component.hasUnsavedChanges()) {
    return confirm('You have unsaved changes. Leave page?');
  }
  return true;
};
```

```typescript
// In component:
hasUnsavedChanges(): boolean {
  return this.form.dirty;
}
```

```typescript
// In route:
{
  path: ':id/edit',
  loadComponent: () => import('./lead-form-page.component'),
  canDeactivate: [unsavedChangesGuard],
}
```

---

## Anti-Patterns

| Anti-pattern | Problem |
|---|---|
| Template-driven forms | No type safety, hard to test |
| Inline error messages without a shared component | Duplication across 50 form fields |
| No `markAllAsTouched()` on submit | Errors stay hidden |
| Submitting `form.value` instead of `form.getRawValue()` | Disabled controls are excluded from `.value` |
| No debounce on async validators | Hammers the API on every keystroke |
