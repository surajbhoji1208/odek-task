# 08 — UI & Design System

## Angular Material Theming

### Custom Theme Setup

```scss
// styles/_theme.scss
@use '@angular/material' as mat;

// Define custom palette
$primary-palette: mat.define-palette(mat.$indigo-palette, 600);
$accent-palette: mat.define-palette(mat.$pink-palette, A200);
$warn-palette: mat.define-palette(mat.$red-palette);

// Light theme
$light-theme: mat.define-light-theme((
  color: (
    primary: $primary-palette,
    accent: $accent-palette,
    warn: $warn-palette,
  ),
  typography: mat.define-typography-config(
    $font-family: 'Inter, sans-serif',
    $headline-5: mat.define-typography-level(24px, 32px, 700),
    $body-1: mat.define-typography-level(14px, 20px, 400),
  ),
  density: 0,
));

// Dark theme
$dark-theme: mat.define-dark-theme((
  color: (
    primary: $primary-palette,
    accent: $accent-palette,
    warn: $warn-palette,
  ),
));

// Apply in styles.scss
@include mat.all-component-themes($light-theme);

.dark-theme {
  @include mat.all-component-colors($dark-theme);
}
```

### Apply Theme Dynamically

```typescript
// core/services/theme.service.ts
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private appState = inject(AppState);

  constructor() {
    effect(() => {
      document.body.classList.toggle('dark-theme', this.appState.theme() === 'dark');
    });
  }
}
```

---

## SCSS Variables & Design Tokens

```scss
// styles/_variables.scss

// Spacing
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
$spacing-2xl: 48px;

// Typography
$font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
$font-mono: 'JetBrains Mono', monospace;
$font-size-xs: 11px;
$font-size-sm: 12px;
$font-size-md: 14px;
$font-size-lg: 16px;
$font-size-xl: 20px;
$font-size-2xl: 24px;

// Colors (semantic tokens)
$color-primary: #4F46E5;
$color-success: #027A48;
$color-warning: #B45309;
$color-error: #B42318;
$color-text-primary: #101828;
$color-text-secondary: #667085;
$color-border: #EAECF0;
$color-surface: #F9FAFB;
$color-bg: #FFFFFF;

// Border radius
$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
$radius-full: 9999px;

// Shadows
$shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.05);
$shadow-md: 0 4px 8px rgba(16, 24, 40, 0.1);
$shadow-lg: 0 8px 24px rgba(16, 24, 40, 0.15);
```

---

## SCSS Mixins

```scss
// styles/_mixins.scss
@use 'variables' as *;

@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@mixin responsive($breakpoint) {
  @if $breakpoint == 'sm' {
    @media (min-width: 576px) { @content; }
  } @else if $breakpoint == 'md' {
    @media (min-width: 768px) { @content; }
  } @else if $breakpoint == 'lg' {
    @media (min-width: 1024px) { @content; }
  } @else if $breakpoint == 'xl' {
    @media (min-width: 1280px) { @content; }
  }
}

@mixin truncate($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
```

---

## Shared Button Component

```typescript
// shared/components/button/button.component.ts
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <button
      [attr.type]="type()"
      [disabled]="disabled() || isLoading()"
      [color]="color()"
      [mat-button]="variant() === 'text'"
      [mat-raised-button]="variant() === 'raised'"
      [mat-stroked-button]="variant() === 'outlined'"
      [mat-icon-button]="variant() === 'icon'"
      (click)="handleClick($event)"
    >
      @if (isLoading()) {
        <mat-spinner diameter="18" />
      } @else if (icon()) {
        <mat-icon>{{ icon() }}</mat-icon>
      }
      <ng-content />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  type = input<'button' | 'submit' | 'reset'>('button');
  variant = input<'raised' | 'outlined' | 'text' | 'icon'>('raised');
  color = input<'primary' | 'accent' | 'warn'>('primary');
  disabled = input(false);
  isLoading = input(false);
  icon = input<string | null>(null);

  clicked = output<MouseEvent>();

  handleClick(event: MouseEvent): void {
    if (!this.disabled() && !this.isLoading()) {
      this.clicked.emit(event);
    }
  }
}
```

---

## Reusable Data Table Component

```typescript
// shared/components/data-table/data-table.component.ts
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => string | TemplateRef<unknown>;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [MatTableModule, MatSortModule, MatPaginatorModule, MatProgressBarModule, CommonModule],
  template: `
    @if (isLoading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    <mat-table [dataSource]="data()" matSort (matSortChange)="onSort($event)">
      @for (col of columns(); track col.key) {
        <ng-container [matColumnDef]="col.key.toString()">
          <mat-header-cell *matHeaderCellDef [mat-sort-header]="col.sortable ? col.key.toString() : ''">
            {{ col.label }}
          </mat-header-cell>
          <mat-cell *matCellDef="let row">
            {{ getCellValue(row, col) }}
          </mat-cell>
        </ng-container>
      }
      <mat-header-row *matHeaderRowDef="displayedColumns()" />
      <mat-row *matRowDef="let row; columns: displayedColumns();" />
    </mat-table>
    <mat-paginator
      [length]="totalCount()"
      [pageSize]="pageSize()"
      [pageSizeOptions]="[10, 25, 50, 100]"
      (page)="pageChanged.emit($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T extends Record<string, unknown>> {
  columns = input.required<TableColumn<T>[]>();
  data = input.required<T[]>();
  isLoading = input(false);
  totalCount = input(0);
  pageSize = input(10);

  pageChanged = output<PageEvent>();
  sortChanged = output<Sort>();

  displayedColumns = computed(() => this.columns().map(c => c.key.toString()));

  getCellValue(row: T, col: TableColumn<T>): string {
    return String(row[col.key as keyof T] ?? '—');
  }

  onSort(sort: Sort): void {
    this.sortChanged.emit(sort);
  }
}
```

---

## Page Header Component

```typescript
// shared/components/page-header/page-header.component.ts
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="page-header">
      @if (showBack()) {
        <button mat-icon-button (click)="backClicked.emit()">
          <mat-icon>arrow_back</mat-icon>
        </button>
      }
      <div class="page-header__content">
        <h1 class="page-header__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-header__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="page-header__actions">
        <ng-content select="[actions]" />
      </div>
    </div>
  `,
  styleUrl: './page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string | null>(null);
  showBack = input(false);

  backClicked = output<void>();
}
```

---

## Responsive Layout

```scss
// Shell uses CSS Grid for sidebar + content
.app-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 64px 1fr;
  min-height: 100vh;

  @include responsive('md') {
    grid-template-columns: 240px 1fr;
  }

  &.sidebar-collapsed {
    grid-template-columns: 72px 1fr;
  }
}
```

---

## Accessibility Standards

- All interactive elements have `aria-label` or visible text
- Color is not the only way to convey information
- Focus is always visible (`outline` not removed)
- All form fields are labeled with `<mat-label>`
- Error messages are announced via `aria-live`
- Images have `alt` text

---

## Dark / Light Mode Toggle

```typescript
// In component:
toggleTheme(): void {
  this.appState.setTheme(
    this.appState.theme() === 'light' ? 'dark' : 'light'
  );
}
```

```html
<button mat-icon-button (click)="toggleTheme()">
  <mat-icon>{{ appState.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
</button>
```
