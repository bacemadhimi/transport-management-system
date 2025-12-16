import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { PagedData } from '../types/paged-data';
import { IUser } from '../types/user';
import { ITruck } from '../types/truck';
import { IDriver } from '../types/driver';
import { ITrip } from '../types/trip';
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

  addUser(user: IUser) {
    return this.http.post(environment.apiUrl + '/api/User', user);
  }


 UpdateUserById(id:number, user:IUser){
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

}