// app.routes.ts
import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Profile } from './pages/profile/profile';
import { AuthGuard } from './services/auth.guard'; // Ajustez le chemin
import { User } from './pages/user/user';
import { Truck } from './pages/truck/truck';
import { Driver } from './pages/driver/driver';
import { Trip } from './pages/trip/trip';
import { Customer } from './pages/customer/customer';
import { FuelVendor } from './pages/fuel-vendor/fuel-vendor';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
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
    path: 'drivers',
    component: Driver,
    canActivate: [AuthGuard]
  },

  {
    path: 'profile',
    component: Profile,
    canActivate: [AuthGuard]
  },

  {
  path: 'user',
  component: User,
},
  {
    path: "trucks",
    component: Truck,
    canActivate: [AuthGuard]  
  },
  {
    path: "trips",
    component: Trip,
    canActivate: [AuthGuard]  
  },
  {
    path: "customers",
    component: Customer,
    canActivate: [AuthGuard]  
  },
  {
    path: "fuel-vendors",
    component: FuelVendor,
    canActivate: [AuthGuard]  
  }
];