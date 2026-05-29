# 16 — Reusable Component Strategy

## When to Extract to Shared

Extract a component from `feature/components/` to `shared/components/` when:
1. Two or more distinct features need it
2. It has zero feature-specific imports
3. It communicates only via `input()` / `output()`

---

## Reusable Dialog Pattern

```typescript
// shared/components/confirm-dialog/confirm-dialog.component.ts
export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data().title }}</h2>
    <mat-dialog-content>
      <p>{{ data().message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>
        {{ data().cancelLabel ?? 'Cancel' }}
      </button>
      <button
        mat-raised-button
        [color]="data().confirmColor ?? 'primary'"
        [mat-dialog-close]="true"
      >
        {{ data().confirmLabel ?? 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
```

Usage from any component:

```typescript
// core/services/dialog.service.ts
@Injectable({ providedIn: 'root' })
export class DialogService {
  private dialog = inject(MatDialog);

  confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open(ConfirmDialogComponent, { data, width: '420px' })
      .afterClosed()
      .pipe(map(result => !!result));
  }
}

// In a feature component:
onDelete(id: number): void {
  this.dialogService
    .confirm({
      title: 'Delete Lead',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmColor: 'warn',
    })
    .pipe(
      filter(confirmed => confirmed),
      switchMap(() => this.leadService.deleteLead(id)),
    )
    .subscribe();
}
```

---

## Generic DataTable Component

```typescript
// shared/components/data-table/data-table.component.ts
export interface TableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => string | TemplateRef<unknown>;
  cellClass?: string;
}

export interface TableAction<T> {
  label: string;
  icon?: string;
  color?: 'primary' | 'warn';
  disabled?: (row: T) => boolean;
  visible?: (row: T) => boolean;
  onClick: (row: T) => void;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [MatTableModule, MatSortModule, MatPaginatorModule, MatMenuModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-table [dataSource]="data()" matSort (matSortChange)="sortChanged.emit($event)">
      @for (col of columns(); track col.key) {
        <ng-container [matColumnDef]="col.key">
          <mat-header-cell *matHeaderCellDef
            [mat-sort-header]="col.sortable ? col.key : ''"
            [style.width]="col.width"
          >
            {{ col.label }}
          </mat-header-cell>
          <mat-cell *matCellDef="let row; let i = index">
            @if (col.render) {
              {{ col.render(row, i) }}
            } @else {
              {{ row[col.key] ?? '—' }}
            }
          </mat-cell>
        </ng-container>
      }

      @if (actions().length) {
        <ng-container matColumnDef="__actions">
          <mat-header-cell *matHeaderCellDef />
          <mat-cell *matCellDef="let row">
            <button mat-icon-button [matMenuTriggerFor]="menu">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu>
              @for (action of visibleActions(row); track action.label) {
                <button mat-menu-item
                  [disabled]="action.disabled?.(row)"
                  (click)="action.onClick(row)"
                >
                  @if (action.icon) { <mat-icon>{{ action.icon }}</mat-icon> }
                  {{ action.label }}
                </button>
              }
            </mat-menu>
          </mat-cell>
        </ng-container>
      }

      <mat-header-row *matHeaderRowDef="displayedColumns()" />
      <mat-row *matRowDef="let row; columns: displayedColumns();" />

      <tr class="mat-row" *matNoDataRow>
        <mat-cell [attr.colspan]="displayedColumns().length" class="no-data-cell">
          No data found.
        </mat-cell>
      </tr>
    </mat-table>

    <mat-paginator
      [length]="totalCount()"
      [pageSize]="pageSize()"
      [pageSizeOptions]="pageSizeOptions()"
      (page)="pageChanged.emit($event)"
      showFirstLastButtons
    />
  `,
})
export class DataTableComponent<T extends Record<string, unknown>> {
  columns = input.required<TableColumn<T>[]>();
  data = input.required<T[]>();
  actions = input<TableAction<T>[]>([]);
  totalCount = input(0);
  pageSize = input(10);
  pageSizeOptions = input<number[]>([10, 25, 50]);

  pageChanged = output<PageEvent>();
  sortChanged = output<Sort>();

  displayedColumns = computed(() => {
    const cols = this.columns().map(c => c.key);
    return this.actions().length ? [...cols, '__actions'] : cols;
  });

  visibleActions(row: T): TableAction<T>[] {
    return this.actions().filter(a => a.visible?.(row) !== false);
  }
}
```

---

## Reusable Layout Components

```typescript
// shared/components/empty-state/empty-state.component.ts
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="empty-state">
      <mat-icon class="empty-state__icon">{{ icon() }}</mat-icon>
      <h3 class="empty-state__title">{{ title() }}</h3>
      @if (subtitle()) {
        <p class="empty-state__subtitle">{{ subtitle() }}</p>
      }
      @if (actionLabel()) {
        <button mat-raised-button color="primary" (click)="actionClicked.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  icon = input('inbox');
  title = input('No data found');
  subtitle = input<string | null>(null);
  actionLabel = input<string | null>(null);

  actionClicked = output<void>();
}
```

---

## Reusable Search / Filter Bar

```typescript
// shared/components/search-bar/search-bar.component.ts
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <mat-form-field appearance="outline">
      <mat-icon matPrefix>search</mat-icon>
      <input
        matInput
        [formControl]="control"
        [placeholder]="placeholder()"
      />
      @if (control.value) {
        <button matSuffix mat-icon-button (click)="clear()">
          <mat-icon>close</mat-icon>
        </button>
      }
    </mat-form-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  control = new FormControl('');
  placeholder = input('Search...');
  debounceMs = input(300);

  searched = output<string>();

  ngOnInit(): void {
    this.control.valueChanges.pipe(
      debounceTime(this.debounceMs()),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(value => this.searched.emit(value ?? ''));
  }

  clear(): void {
    this.control.reset('');
  }
}
```

---

## Status Badge Component

```typescript
// shared/components/status-badge/status-badge.component.ts
export type BadgeColor = 'success' | 'warning' | 'error' | 'info' | 'default';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="badge badge--{{ color() }}">{{ label() }}</span>
  `,
  styleUrl: './status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  label = input.required<string>();
  color = input<BadgeColor>('default');
}
```

```scss
// status-badge.component.scss
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;

  &--success { background: #ECFDF3; color: #027A48; }
  &--warning { background: #FFFAEB; color: #B45309; }
  &--error   { background: #FEF3F2; color: #B42318; }
  &--info    { background: #EFF8FF; color: #175CD3; }
  &--default { background: #F2F4F7; color: #344054; }
}
```

---

## Shared Component Barrel (index.ts)

```typescript
// shared/components/index.ts — public API
export { DataTableComponent } from './data-table/data-table.component';
export { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
export { EmptyStateComponent } from './empty-state/empty-state.component';
export { SearchBarComponent } from './search-bar/search-bar.component';
export { StatusBadgeComponent } from './status-badge/status-badge.component';
export { PageHeaderComponent } from './page-header/page-header.component';
```

Consuming components import from the barrel:

```typescript
import { DataTableComponent, SearchBarComponent } from '@shared/components';
```
