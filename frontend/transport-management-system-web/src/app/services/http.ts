import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { PagedData } from '../types/paged-data';
import { IUser } from '../types/user';
import { ITruck } from '../types/truck';
import { IDriver } from '../types/driver';
import { CreateTripDto, IDelivery, ITrip, TripStatus, UpdateTripDto } from '../types/trip';
import { ICustomer } from '../types/customer';
import { IFuelVendor } from '../types/fuel-vendor';
import { IFuel } from '../types/fuel';
import { IMechanic } from '../types/mechanic';
import { IVendor } from '../types/vendor';
import { catchError, map, Observable, of } from 'rxjs';
import { IRole } from '../types/role';
import { IOrder } from '../types/order';
import { ICreateTrajectDto, IPagedTrajectData, ITraject, IUpdateTrajectDto } from '../types/traject';
import { ApiResponse, ICreateLocationDto, ILocation, IUpdateLocationDto } from '../types/location';
import { IConvoyeur } from '../types/convoyeur';
import { IDayOff } from '../types/dayoff';
import { ICreateOvertimeSetting, IOvertimeSetting } from '../types/overtime';
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

 getTripsList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<ITrip>>(environment.apiUrl + '/api/Trips?' + params.toString());
  }

  getTrip(id: number) {
    return this.http.get<ITrip>(environment.apiUrl + '/api/Trips/' + id);
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


// Alias pour compatibilité avec le code existant
addTrip(trip: CreateTripDto) {
  return this.createTrip(trip);
}

updateTripStatus(id: number, statusDto: { status: string }) {
  return this.http.put(environment.apiUrl + '/api/Trips/' + id + '/status', statusDto);
}

getTripSummary(id: number) {
  return this.http.get<any>(environment.apiUrl + '/api/Trips/' + id + '/summary');
}

getTripDeliveries(tripId: number) {
  return this.http.get<IDelivery[]>(environment.apiUrl + '/api/Trips/' + tripId + '/deliveries');
}

getTripRoute(tripId: number) {
  return this.http.get<any>(environment.apiUrl + '/api/Trips/' + tripId + '/route');
}

reorderDeliveries(tripId: number, reorderList: any[]) {
  return this.http.put(environment.apiUrl + '/api/Trips/' + tripId + '/reorder-deliveries', reorderList);
}

// === ORDERS (pour les livraisons) ===
getOrders(filter?: any): Observable<IOrder[]> {
  const params = filter ? new HttpParams({ fromObject: filter }) : new HttpParams();
  return this.http.get<IOrder[]>(environment.apiUrl + '/api/Orders?' + params.toString());
}

getOrder(id: number): Observable<IOrder> {
  return this.http.get<IOrder>(environment.apiUrl + '/api/Orders/' + id);
}

getOrdersByCustomer(customerId: number): Observable<IOrder[]> {
  return this.http.get<IOrder[]>(environment.apiUrl + '/api/Orders/by-customer/' + customerId);
}

// === TRUCKS ===
getAvailableTrucks() {
  return this.http.get<ITruck[]>(environment.apiUrl + '/api/Trucks/available');
}

// === DRIVERS ===
getAvailableDrivers() {
  return this.http.get<IDriver[]>(environment.apiUrl + '/api/Driver/available');
}

// === DASHBOARD ===
getDashboardStats(startDate?: Date, endDate?: Date) {
  let params = new HttpParams();
  if (startDate) {
    params = params.set('startDate', startDate.toISOString());
  }
  if (endDate) {
    params = params.set('endDate', endDate.toISOString());
  }
  return this.http.get<any>(environment.apiUrl + '/api/Trips/dashboard?' + params.toString());
}

// === VALIDATIONS ===
checkTruckAvailability(truckId: number, startDate: string, endDate: string) {
  const params = new HttpParams()
    .set('truckId', truckId.toString())
    .set('startDate', startDate)
    .set('endDate', endDate);
  
  return this.http.get<{ available: boolean; conflictingTripId?: number }>(
    environment.apiUrl + '/api/Trips/check-truck-availability?' + params.toString()
  );
}

checkDriverAvailability(driverId: number, startDate: string, endDate: string) {
  const params = new HttpParams()
    .set('driverId', driverId.toString())
    .set('startDate', startDate)
    .set('endDate', endDate);
  
  return this.http.get<{ available: boolean; conflictingTripId?: number }>(
    environment.apiUrl + '/api/Trips/check-driver-availability?' + params.toString()
  );
}


// Also update getOrdersByCustomerId
getOrdersByCustomerId(customerId: number): Observable<IOrder[]> {
  return this.http.get<any>(environment.apiUrl + `/api/orders/customer/${customerId}`).pipe(
    map(response => {
      // Same logic as above
      if (Array.isArray(response)) {
        return response as IOrder[];
      }
      
      if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          return response.data as IOrder[];
        }
        if (response.success && Array.isArray(response.data)) {
          return response.data as IOrder[];
        }
      }
      
      return [];
    }),
    catchError(error => {
      console.error('Error in getOrdersByCustomerId:', error);
      return of([]);
    })
  );
}
// Update the updateTrip method to accept UpdateTripDto
updateTrip(id: number, trip: UpdateTripDto) {
  return this.http.put<ITrip>(environment.apiUrl + '/api/Trips/' + id, trip);
}

// Keep createTrip as is
createTrip(trip: CreateTripDto) {
  return this.http.post<ITrip>(environment.apiUrl + '/api/Trips', trip);
}
// http.service.ts
// Ajoutez ces méthodes dans votre service Http
getTrajectsList(filter: any): Observable<IPagedTrajectData> {
  return this.http.get<IPagedTrajectData>(`${environment.apiUrl}/api/Traject/PaginationAndSearch`, {
    params: filter
  });
}

getAllTrajects(): Observable<ITraject[]> {
  return this.http.get<ITraject[]>(`${environment.apiUrl}/api/Traject/ListOfTrajects`);
}

getTrajectById(id: number): Observable<ITraject> {
  return this.http.get<ITraject>(`${environment.apiUrl}/api/Traject/${id}`);
}

createTraject(traject: ICreateTrajectDto): Observable<ITraject> {
  return this.http.post<ITraject>(`${environment.apiUrl}/api/Traject`, traject);
}

updateTraject(id: number, traject: IUpdateTrajectDto): Observable<ITraject> {
  return this.http.put<ITraject>(`${environment.apiUrl}/api/Traject/${id}`, traject);
}

deleteTraject(id: number | undefined): Observable<void> {
  return this.http.delete<void>(`${environment.apiUrl}/api/Traject/${id}`);
}
// Location methods
getLocationsList(filter?: any): Observable<PagedData<ILocation>> {
  const params = new HttpParams({ fromObject: filter || {} });
  return this.http.get<PagedData<ILocation>>(`${environment.apiUrl}/api/locations/PaginationAndSearch`, { params });
}

getLocation(locationId: number) {
  return this.http.get<ApiResponse<ILocation>>(
    `${environment.apiUrl}/api/locations/${locationId}`
  );
}



createLocation(data: ICreateLocationDto): Observable<ILocation> {
  return this.http.post<ILocation>(`${environment.apiUrl}/api/locations`, data);
}

updateLocation(id: number, data: IUpdateLocationDto): Observable<ILocation> {
  return this.http.put<ILocation>(`${environment.apiUrl}/api/locations/${id}`, data);
}

deleteLocation(id: number): Observable<any> {
  return this.http.delete(`${environment.apiUrl}/api/locations/${id}`);
}

getLocations(): Observable<ILocation[]> {
  return this.http.get<ILocation[]>(`${environment.apiUrl}/api/locations`);
}
getConvoyeursList(filter: any) {
  const params = new HttpParams({ fromObject: filter });
  return this.http.get<PagedData<IConvoyeur>>(
    environment.apiUrl + '/api/Convoyeur/Pagination and Search?' + params.toString()
  );
}
getConvoyeurs(): Observable<IConvoyeur[]> {
  return this.http.get<IConvoyeur[]>(`${environment.apiUrl}/api/Convoyeur/ListOfConvoyeurs`);
}
getConvoyeur(id: number) {
  return this.http.get<IConvoyeur>(
    environment.apiUrl + '/api/Convoyeur/' + id
  );
}

addConvoyeur(convoyeur: any) {
  return this.http.post(
    environment.apiUrl + '/api/Convoyeur/',
    convoyeur
  );
}

updateConvoyeur(id: number, convoyeur: any) {
  return this.http.put(
    environment.apiUrl + '/api/Convoyeur/' + id,
    convoyeur
  );
}

deleteConvoyeur(id: number) {
  return this.http.delete(
    environment.apiUrl + '/api/Convoyeur/' + id
  );
}
// Add these methods to your existing Http service
getDayOffs(params?: any): Observable<PagedData<IDayOff>> {
  return this.http.get<PagedData<IDayOff>>(`${environment.apiUrl}/api/DayOff/Pagination and Search`, { params });
}

getDayOff(id: number): Observable<IDayOff> {
  return this.http.get<IDayOff>(`${environment.apiUrl}/api/DayOff/${id}`);
}

addDayOff(dayOff: IDayOff): Observable<IDayOff> {
  return this.http.post<IDayOff>(`${environment.apiUrl}/api/DayOff`, dayOff);
}

updateDayOff(id: number, dayOff: IDayOff): Observable<any> {
  return this.http.put(`${environment.apiUrl}/api/DayOff/${id}`, dayOff);
}

deleteDayOff(id: number): Observable<any> {
  return this.http.delete(`${environment.apiUrl}/api/DayOff/${id}`);
}
// Overtime Settings Methods
getOvertimeSettings(params?: any): Observable<PagedData<IOvertimeSetting>> {
  return this.http.get<PagedData<IOvertimeSetting>>(`${environment.apiUrl}/api/OvertimeSetting`, { params });
}

getOvertimeSetting(id: number): Observable<IOvertimeSetting> {
  return this.http.get<IOvertimeSetting>(`${environment.apiUrl}/api/OvertimeSetting/${id}`);
}

getOvertimeSettingByDriver(driverId: number): Observable<IOvertimeSetting> {
  return this.http.get<IOvertimeSetting>(`${environment.apiUrl}/api/OvertimeSetting/driver/${driverId}`);
}

addOvertimeSetting(overtimeSetting: ICreateOvertimeSetting): Observable<IOvertimeSetting> {
  return this.http.post<IOvertimeSetting>(`${environment.apiUrl}/api/OvertimeSetting`, overtimeSetting);
}

updateOvertimeSetting(id: number, overtimeSetting: ICreateOvertimeSetting): Observable<any> {
  return this.http.put(`${environment.apiUrl}/api/OvertimeSetting/${id}`, overtimeSetting);
}

deleteOvertimeSetting(id: number): Observable<any> {
  return this.http.delete(`${environment.apiUrl}/api/OvertimeSetting/${id}`);
}

toggleOvertimeStatus(id: number): Observable<any> {
  return this.http.patch(`${environment.apiUrl}/api/OvertimeSetting/${id}/toggle-status`, {});
}

getDriverAvailability(driverId: number): Observable<any> {
    return this.http.get(`${environment.apiUrl}/api/driver/${driverId}/availability`);
  }

  updateDriverAvailability(driverId: number, availability: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/api/driver/${driverId}/availability`, { availability });
  }

  //getAllDriversAvailability(dateRange: { startDate: string, endDate: string }): Observable<any> {
   // return this.http.get(`${environment.apiUrl}/drivers/availability`, { params: dateRange });
  //}
   getCompanyDayOffs(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/api/driver/company/dayoffs`);
  }
  getAllDriversAvailability(params: any): Observable<any> {
  return this.http.get(`${environment.apiUrl}/api/driver/availability/all`, { params });
}
}