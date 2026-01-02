// app.routes.ts
import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Profile } from './pages/profile/profile';
import { AuthGuard } from './services/auth.guard'; 
import { User } from './pages/user/user';
import { Truck } from './pages/truck/truck';
import { Driver } from './pages/driver/driver';
import { Trip } from './pages/trip/trip';
import { Customer } from './pages/customer/customer';
import { FuelVendor } from './pages/fuel-vendor/fuel-vendor';
import { Fuel } from './pages/fuel/fuel';
import { Mechanic } from './pages/mechanic/mechanic';
import { Vendor } from './pages/vendor/vendor';

import { Permissions } from './pages/permissions/permissions';
import { Role } from './pages/role/role';
import { TrajectComponent } from './pages/traject/traject';
import { LocationComponent } from './pages/location/location';


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
  },
  {
    path: "fuels",
    component: Fuel,
    canActivate: [AuthGuard]  
  },
{
    path: "mechanics",
    component: Mechanic,
    canActivate: [AuthGuard]  
  },
{
    path: "vendors",
    component: Vendor,
    canActivate: [AuthGuard]  
  },

{
    path: "roles",
    component: Role,
    canActivate: [AuthGuard]  
  },
 
{
  path: "permissions",
  component: Permissions,
  canActivate: [AuthGuard]
},
{
    path: 'trajects',
    component: TrajectComponent,
    title: 'Gestion des trajects'
  },
   {
    path: 'locations',
    component: LocationComponent,
    title: 'Locations'
  },

];