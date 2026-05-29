import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, filter, map, take, tap, throwError } from 'rxjs';
import { AppState } from '../store/app.state';
import { AuthResponse, LoginDto } from './models/auth-response.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private appState = inject(AppState);

  private _isRefreshing = signal(false);
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  isAuthenticated = computed(() => this.appState.currentUser() !== null);
  currentUser = this.appState.currentUser;

  login(credentials: LoginDto): Observable<void> {
    // Mocking login for now since there's no backend yet
    // return this.http.post<AuthResponse>('/auth/login', credentials).pipe(
    //   tap(response => this.handleAuthSuccess(response)),
    //   map(() => void 0),
    // );

    // Fake success for demonstration
    const mockResponse: AuthResponse = {
      accessToken: 'fake-jwt-token',
      user: {
        id: 1,
        email: credentials.email,
        firstName: 'Demo',
        lastName: 'User',
        role: 'admin'
      }
    };

    return new Observable<void>(observer => {
      setTimeout(() => {
        this.handleAuthSuccess(mockResponse);
        observer.next();
        observer.complete();
      }, 1000);
    });
  }

  logout(): void {
    // this.http.post('/auth/logout', {}).subscribe();
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  refreshToken(): Observable<string> {
    if (this._isRefreshing()) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        map(token => token as string),
      );
    }

    this._isRefreshing.set(true);
    this.refreshTokenSubject.next(null);

    return this.http.post<AuthResponse>('/auth/refresh', {}).pipe(
      tap(response => {
        this._isRefreshing.set(false);
        this.storeToken(response.accessToken);
        this.refreshTokenSubject.next(response.accessToken);
      }),
      map(response => response.accessToken),
      catchError(error => {
        this._isRefreshing.set(false);
        this.clearSession();
        this.router.navigate(['/auth/login']);
        return throwError(() => error);
      }),
    );
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem('access_token');
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.storeToken(response.accessToken);
    this.appState.setCurrentUser(response.user);
  }

  private storeToken(token: string): void {
    sessionStorage.setItem('access_token', token);
  }

  private clearSession(): void {
    sessionStorage.removeItem('access_token');
    this.appState.setCurrentUser(null);
  }
}
