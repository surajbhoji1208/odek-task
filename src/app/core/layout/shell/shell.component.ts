import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <app-header />
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: [`
    .content {
      padding: 20px;
    }
  `]
})
export class ShellComponent { }
