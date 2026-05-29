import { Injectable, signal } from '@angular/core';
import { User } from '../auth/models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AppState {
  currentUser = signal<User | null>(null);

  setCurrentUser(user: User | null): void {
    this.currentUser.set(user);
  }
}
