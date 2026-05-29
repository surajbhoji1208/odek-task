import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <h1>Welcome back, {{ authService.currentUser()?.firstName }}!</h1>
        <p class="subtitle">Here's what's happening in your workspace.</p>
      </div>

      <div class="stats-grid">
        @for (stat of stats; track stat.label) {
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-icon">
                <mat-icon>{{ stat.icon }}</mat-icon>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ stat.value }}</span>
                <span class="stat-label">{{ stat.label }}</span>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      <div class="user-info">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Account Details</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="info-row">
              <span class="info-label">Name</span>
              <span>{{ authService.currentUser()?.firstName }} {{ authService.currentUser()?.lastName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email</span>
              <span>{{ authService.currentUser()?.email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Role</span>
              <span class="role-badge">{{ authService.currentUser()?.role }}</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="warn" (click)="authService.logout()">
              <mat-icon>logout</mat-icon>
              Sign Out
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    .dashboard-header {
      margin-bottom: 32px;

      h1 {
        margin: 0 0 8px;
        font-size: 2rem;
      }

      .subtitle {
        margin: 0;
        color: #666;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;

      .stat-icon mat-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
        color: #1976d2;
      }

      .stat-info {
        display: flex;
        flex-direction: column;

        .stat-value {
          font-size: 1.75rem;
          font-weight: 600;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #666;
          margin-top: 4px;
        }
      }
    }

    .user-info {
      max-width: 480px;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      .info-label {
        width: 80px;
        font-weight: 500;
        color: #666;
        flex-shrink: 0;
      }
    }

    .role-badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: capitalize;
    }
  `],
})
export class DashboardPageComponent {
  authService = inject(AuthService);

  stats = [
    { label: 'Total Leads', value: '128', icon: 'people' },
    { label: 'Active Deals', value: '24', icon: 'trending_up' },
    { label: 'Closed This Month', value: '9', icon: 'check_circle' },
    { label: 'Revenue', value: '$48k', icon: 'attach_money' },
  ];
}
