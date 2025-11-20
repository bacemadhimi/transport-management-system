import { inject, Injectable } from '@angular/core';;
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Dashboard {
  http=inject(HttpClient)
    constructor(){ }
    getDashboardData(){
    }

  }
  

