import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { PagedData } from '../types/paged-data';
import { IUser } from '../types/user';
import { ITruck } from '../types/truck';
@Injectable({
  providedIn: 'root'
})
export class Http {
  http = inject(HttpClient);
  constructor(){}
  
getUsersList(filter: any) {
  console.log('e')
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
}