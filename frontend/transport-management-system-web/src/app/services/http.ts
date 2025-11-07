import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { PagedData } from '../types/paged-data';

@Injectable({
  providedIn: 'root'
})
export class Http {
  http = inject(HttpClient);
  constructor(){}
  

}