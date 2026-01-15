import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { IAuthToken } from '../types/auth';
import { Router } from '@angular/router';
import { IUser } from '../types/user';

@Injectable({ providedIn: 'root' })
export class Auth {
  http = inject(HttpClient);
  user = signal<IUser | null>(null);
  router = inject(Router);

  // ----------- Auth & Token ----------------
  login(email: string, password: string) {
    return this.http.post<IAuthToken>(`${environment.apiUrl}/api/Auth/login`, { email, password });
  }

  saveToken(authToken: IAuthToken) {
    localStorage.setItem("authLila", JSON.stringify(authToken));
    localStorage.setItem('token', authToken.token);
  }

  logout() {
    localStorage.removeItem('authLila');
    localStorage.removeItem('token');
    this.router.navigateByUrl("/login");
  }

  get isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  get authDetail(): IAuthToken | null {
    const token = localStorage.getItem('authLila');
    return token ? JSON.parse(token) : null;
  }

  // ----------- Roles & Permissions ----------------
  hasRole(role: string): boolean {
    const roles = this.authDetail?.roles ?? [];
    return roles.includes(role);
  }

  hasPermission(permission: string): boolean {
    if (this.hasRole('SuperAdmin')) return true; // SuperAdmin a tout
    const permissions = this.authDetail?.permissions ?? [];
    return permissions.includes(permission);
  }

  /**
   * Vérifie si l'utilisateur a au moins un droit sur une entité
   * @param entity : nom de l'entité, ex: 'CONVOYEUR', 'TRUCK'
   */
  hasEntityAccess(entity: string): boolean {
    if (this.hasRole('SuperAdmin')) return true;
    const perms = this.authDetail?.permissions ?? [];
    // Cherche si l'utilisateur a au moins un droit CRUD ou PRINT sur l'entité
    return perms.some(p => p.startsWith(entity + '_'));
  }


  hasConvoyeurAccess(): boolean { return this.hasEntityAccess('CONVOYEUR'); }
  hasTruckAccess(): boolean { return this.hasEntityAccess('TRUCK'); }
  hasChauffeurAccess(): boolean { return this.hasEntityAccess('CHAUFFEUR'); }
  hasOrderAccess(): boolean { return this.hasEntityAccess('ORDER'); }


  get profileImage(): string | null {
    const pic = this.user()?.profileImage;
    return pic ? `data:image/jpeg;base64,${pic}` : null;
  }

  getProfile() {
    return this.http.get(`${environment.apiUrl}/api/Auth/profile`);
  }

  updateProfile(profile: any) {
    return this.http.post(`${environment.apiUrl}/api/Auth/profile`, profile);
  }

  forgotPassword(email: string) {
    return this.http.post(`${environment.apiUrl}/api/Auth/forgot-password`, { email });
  }

  loadLoggedInUser(): void {
    const userId = this.authDetail?.id;
    if (!userId) return;

    this.http.get<IUser>(`${environment.apiUrl}/api/user/${userId}`).subscribe({
      next: user => this.user.set(user),
      error: () => this.user.set(null)
    });
  }
}
