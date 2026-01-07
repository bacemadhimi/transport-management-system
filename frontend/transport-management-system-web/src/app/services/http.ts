import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { PagedData } from '../types/paged-data';
import { IUser } from '../types/user';
import { ITruck } from '../types/truck';
import { IDriver } from '../types/driver';
import { ITrip } from '../types/trip';
import { ICustomer } from '../types/customer';
import { IFuelVendor } from '../types/fuel-vendor';
import { IFuel } from '../types/fuel';
import { IMechanic } from '../types/mechanic';
import { IVendor } from '../types/vendor';
import { Observable } from 'rxjs';
import { IRole } from '../types/role';
@Injectable({
  providedIn: 'root'
})
export class Http {
  http = inject(HttpClient);
  constructor(){}
  
getUsersList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<IUser>>(environment.apiUrl + '/api/User?' + params.toString());
  }

  getUserById(id: number) {
    return this.http.get<IUser>(environment.apiUrl + '/api/User/' + id);
  }

  addUser(user: any) {
    return this.http.post(environment.apiUrl + '/api/User', user);
  }


 UpdateUserById(id:number, user:any){
    return this.http.put(environment.apiUrl+'/api/User/' +id, user);
      
}
  deleteUser(id: number) {
    return this.http.delete(environment.apiUrl + '/api/User/' + id);
  }
   
  getTrucksList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<ITruck>>(environment.apiUrl + '/api/Trucks?' + params.toString());
  }

  getTruck(id: number) {
    return this.http.get<ITruck>(environment.apiUrl + '/api/Trucks/' + id);
  }

  addTruck(truck: any) {
    return this.http.post(environment.apiUrl + '/api/Trucks', truck);
  }

  updateTruck(id: number, truck: any) {
    return this.http.put(environment.apiUrl + '/api/Trucks/' + id, truck);
  }

  deleteTruck(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Trucks/' + id);
  }

  getDriversList(filter: any) {
  const params = new HttpParams({ fromObject: filter });
  return this.http.get<PagedData<IDriver>>(environment.apiUrl + '/api/Driver/Pagination and Search?' + params.toString());
}

//
getdisableDriver(filter: any) {
    const params = new HttpParams({ fromObject: filter });
  return this.http.get<PagedData<IDriver>>(environment.apiUrl + '/api/Driver/PaginationDisableDriver?' + params.toString());
}

getDriver(id: number) {
  return this.http.get<IDriver>(environment.apiUrl + '/api/Driver/' + id);
}

addDriver(driver: any) {
  return this.http.post(environment.apiUrl + '/api/Driver/', driver);
}

updateDriver(id: number, driver: any) {
  return this.http.put(environment.apiUrl + '/api/Driver/' + id, driver);
}

deleteDriver(id: number) {
  return this.http.delete(environment.apiUrl + '/api/Driver/' + id);
}

//Add For Enable Button
enableDriver(id: number) {
  return this.http.put(environment.apiUrl + '/api/Driver/DriverStatus/' + id, {});
} 



 getTripsList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<ITrip>>(environment.apiUrl + '/api/Trips?' + params.toString());
  }

  getTrip(id: number) {
    return this.http.get<ITrip>(environment.apiUrl + '/api/Trips/' + id);
  }

  addTrip(trip: ITrip) {
    return this.http.post<ITrip>(environment.apiUrl + '/api/Trips', trip);
  }

  updateTrip(id: number, trip: ITrip) {
    return this.http.put<ITrip>(environment.apiUrl + '/api/Trips/' + id, trip);
  }

  deleteTrip(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Trips/' + id);
  }
  getTrucks() {
    return this.http.get<ITruck[]>(environment.apiUrl + '/api/Trucks/list');
  }

  getDrivers() {
    return this.http.get<IDriver[]>(environment.apiUrl + '/api/Driver/ListOfDrivers');
  }
 getCustomersList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<ICustomer>>(environment.apiUrl + '/api/Customer/PaginationAndSearch?' + params.toString());
  }

  getCustomer(id: number) {
    return this.http.get<ICustomer>(environment.apiUrl + '/api/Customer/' + id);
  }

  getCustomers() {
    return this.http.get<ICustomer[]>(environment.apiUrl + '/api/Customer/Customer');
  }

 addCustomer(customer: any) {
  return this.http.post(environment.apiUrl + '/api/Customer', customer);
}

  updateCustomer(id: number, customer: any) {
    return this.http.put<ICustomer>(environment.apiUrl + '/api/Customer/' + id, customer);
  }

  deleteCustomer(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Customer/' + id);
  }

  getFuelVendorsList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<IFuelVendor>>(environment.apiUrl + '/api/FuelVendor/Search?' + params.toString());
  }

  getFuelVendor(id: number) {
    return this.http.get<IFuelVendor>(environment.apiUrl + '/api/FuelVendor/' + id);
  }

  addFuelVendor(vendor: any) {
    return this.http.post<IFuelVendor>(environment.apiUrl + '/api/FuelVendor', vendor);
  }

  updateFuelVendor(id: number, vendor: any) {
    return this.http.put<IFuelVendor>(environment.apiUrl + '/api/FuelVendor/' + id, vendor);
  }

  deleteFuelVendor(id: number) {
    return this.http.delete(environment.apiUrl + '/api/FuelVendor/' + id);
  }

  getFuelVendors() {
    return this.http.get<IFuelVendor[]>(environment.apiUrl + '/api/FuelVendor');
  }

  getFuelsList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<IFuel>>(environment.apiUrl + '/api/Fuel/Search?' + params.toString());
  }

  getFuel(id: number) {
    return this.http.get<IFuel>(environment.apiUrl + '/api/Fuel/' + id);
  }

  addFuel(fuel: any) {
    return this.http.post<IFuel>(environment.apiUrl + '/api/Fuel', fuel);
  }

  updateFuel(id: number, fuel: any) {
    return this.http.put<IFuel>(environment.apiUrl + '/api/Fuel/' + id, fuel);
  }
 

  deleteFuel(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Fuel/' + id);
  }

  getFuels() {
    return this.http.get<IFuel[]>(environment.apiUrl + '/api/Fuel/All');
  }

  getMechanicsList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<IMechanic>>(environment.apiUrl + '/api/Mechanic/Pagination and Search?' + params.toString());
  }

  getMechanic(id: number) {
    return this.http.get<IMechanic>(environment.apiUrl + '/api/Mechanic/' + id);
  }

  addMechanic(mechanic: any) {
    return this.http.post<IMechanic>(environment.apiUrl + '/api/Mechanic', mechanic);
  }

  updateMechanic(id: number, mechanic: any) {
    return this.http.put<IMechanic>(environment.apiUrl + '/api/Mechanic/' + id, mechanic);
  }

  deleteMechanic(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Mechanic/' + id);
  }

  getMechanics() {
    return this.http.get<IMechanic[]>(environment.apiUrl + '/api/Mechanic/All');
  }

  getVendorsList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<IVendor>>(
      `${environment.apiUrl}/api/Vendor/Pagination and Search?${params.toString()}`
    );
  }


  getVendor(id: number) {
    return this.http.get<IVendor>(`${environment.apiUrl}/api/Vendor/${id}`);
  }


  addVendor(vendor: any) {
    return this.http.post<IVendor>(`${environment.apiUrl}/api/Vendor`, vendor);
  }

  
  updateVendor(id: number, vendor: any) {
    return this.http.put<IVendor>(`${environment.apiUrl}/api/Vendor/${id}`, vendor);
  }


  deleteVendor(id: number) {
    return this.http.delete(`${environment.apiUrl}/api/Vendor/${id}`);
  }

  getAllVendors() {
    return this.http.get<IVendor[]>(`${environment.apiUrl}/api/Vendor/All`);
  }

  getRolesList(filter: any) {
  const params = new HttpParams({ fromObject: filter });
  return this.http.get<PagedData<IRole>>(environment.apiUrl + '/api/Roles?' + params.toString());
}

getRole(id: number) {
  return this.http.get<IRole>(environment.apiUrl + '/api/Roles/' + id);
}

addRole(group: any) {
  return this.http.post(environment.apiUrl + '/api/Roles/', group);
}

updateRole(id: number, group: any) {
  return this.http.put(environment.apiUrl + '/api/Roles/' + id, group);
}

deleteRole(id: number) {
  return this.http.delete(environment.apiUrl + '/api/Roles/' + id);
}

getRoles() {
  return this.http.get<IRole[]>(environment.apiUrl + '/api/Roles/All');
}

createRole(groupData: { name: string; description?: string }): Observable<IRole> {
  return this.http.post<IRole>(`${environment.apiUrl}/api/Roles`, groupData);
}

getAllRoles(): Observable<IRole[]> {
  return this.http.get<IRole[]>(`${environment.apiUrl}/api/Roles/All`);
}

getRolesByUserId(userId: number): Observable<IRole[]> {
  return this.http.get<IRole[]>(`${environment.apiUrl}/api/User/${userId}/groups`);
}

// Dans votre service HTTP
updateUserById(id: number, userData: any): Observable<any> {
  return this.http.put<any>(`${environment.apiUrl}/user/${id}`, userData);
}
saveGroupPermissions(
  groupId: number,
  permissions: string[]
) {
  return this.http.post(
    `${environment.apiUrl}/api/permissions/group/${groupId}`,
    permissions
  );
}
}