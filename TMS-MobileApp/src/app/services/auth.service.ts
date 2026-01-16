import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IAuthToken, ILoginRequest } from '../types/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  http = inject(HttpClient);
  router = inject(Router);

  // Using signals for reactive state management
  isLoggedIn = signal<boolean>(false);
  currentUser = signal<IAuthToken | null>(null);

  constructor() {
    // Check if user is already logged in on app start
    this.checkAuthStatus();
  }

  login(credentials: ILoginRequest) {
    // TODO: Replace with actual API call
    // return this.http.post<IAuthToken>('/api/auth/login', credentials);

    // Mock login for now
    return new Promise<IAuthToken>((resolve, reject) => {
      setTimeout(() => {
        if (credentials.email && credentials.password) {
          const mockToken: IAuthToken = {
            id: 1,
            email: credentials.email,
            token: 'mock-jwt-token',
            role: 'driver'
          };
          this.saveToken(mockToken);
          resolve(mockToken);
        } else {
          reject({ message: 'Invalid credentials' });
        }
      }, 1000);
    });
  }

  saveToken(authToken: IAuthToken) {
    localStorage.setItem('authToken', JSON.stringify(authToken));
    localStorage.setItem('token', authToken.token);
    this.currentUser.set(authToken);
    this.isLoggedIn.set(true);
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  private checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const authData = JSON.parse(token);
        this.currentUser.set(authData);
        this.isLoggedIn.set(true);
      } catch (error) {
        this.logout();
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}