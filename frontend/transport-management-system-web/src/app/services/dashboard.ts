import { inject, Injectable } from '@angular/core';
import { Http } from './http';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { IDashboard } from '../types/dashboard';


@Injectable({
  providedIn: 'root'
})
export class Dashboard {
  http=inject(HttpClient)
    constructor(){ }
    getDashboardData(){
return this.http.get<IDashboard>(environment.apiUrl+ '/api/Dashboard');
    }

  }
  

