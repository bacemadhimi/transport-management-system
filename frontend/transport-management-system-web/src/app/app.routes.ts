// app.routes.ts
import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Driverdashboard } from './pages/driverdashboard/driverdashboard';
import { Profile } from './pages/profile/profile';
import { AuthGuard } from './services/auth.guard'; // Ajustez le chemin

export const routes: Routes = [
  {
    path:"",
    component: Home,
  },
  {
    path: "login",
    component: Login,
  },
  {
    path: "home",
    component: Home,
    canActivate: [AuthGuard]
  },
  {
    path: 'driver-dashboard',
    component: Driverdashboard,
    canActivate: [AuthGuard]
  },

  {
    path: 'profile',
    component: Profile,
    canActivate: [AuthGuard]
  },
  {
    path: "**",
    redirectTo: "/login"
  }
];