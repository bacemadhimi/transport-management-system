import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { PagedData } from '../types/paged-data';
import { ITrip, CreateTripDto, UpdateTripDto } from '../types/trip';
import { ITruck } from '../types/truck';
import { IDriver } from '../types/driver';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  http = inject(HttpClient);
  constructor() {}

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

  getAllTrips() {
    return this.http.get<ITrip[]>(environment.apiUrl + '/api/Trips/list');
  }

  createTrip(trip: CreateTripDto) {
    return this.http.post<ITrip>(environment.apiUrl + '/api/Trips', trip);
  }

  updateTrip(tripId: number, data: UpdateTripDto): Observable<any> {
    return this.http.put(`${environment.apiUrl}/api/trips/${tripId}`, data);
  }


}