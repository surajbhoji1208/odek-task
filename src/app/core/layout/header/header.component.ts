import { Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, RouterLink],
  template: `
    <mat-toolbar color="primary">
      <span>My Enterprise App</span>
      <span class="spacer"></span>
      @if (authService.isAuthenticated()) {
        <button mat-button routerLink="/dashboard">Dashboard</button>
        <button mat-button routerLink="/dashboard/my-dashboard">My Dashboard</button>
        <button mat-button (click)="authService.logout()">Logout</button>
      } @else {
        <button mat-button routerLink="/auth/login">Login</button>
      }
    </mat-toolbar>
  `,
  styles: [`
    .spacer {
      flex: 1 1 auto;
    }
  `]
})
export class HeaderComponent {
  authService = inject(AuthService);
}
