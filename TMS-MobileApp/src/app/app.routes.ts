import { Routes } from '@angular/router';
import { LoginPage } from './pages/login/login.page';
import { HomePage } from './pages/home/home.page';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginPage
  },
  {
    path: 'home',
    component: HomePage,
    canActivate: [authGuard]
  },  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.page').then( m => m.ProfilePage)
  }

  // Future routes will be added here
];