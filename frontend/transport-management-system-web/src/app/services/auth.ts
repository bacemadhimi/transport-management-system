import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { IAuthToken } from '../types/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  http = inject(HttpClient);
 
  constructor(){}
  router = inject(Router);
  login(email:string,password:string){
   return this.http.post<IAuthToken>(environment.apiUrl+"/api/Auth/login",{
      email:email,
      password:password
    });
  }
  saveToken(authtoken:IAuthToken){
    localStorage.setItem("authLila", JSON.stringify(authtoken))
        localStorage.setItem('token', authtoken.token )

  }
  logout(){
localStorage.removeItem('authLila');
localStorage.removeItem('token');
this.router.navigateByUrl("/login")
  }
  get isLoggedIn(){
    return localStorage.getItem('token') ? true: false
  }
  get isDriver(){
    if(!this.isLoggedIn) return false;
    let token = JSON.parse(localStorage.getItem('authLila')!);
    if (token.role == 'Driver'){
       return true; 
  } else {
   return false;
  }
  }

  get authDetail(): IAuthToken | null{
   if(!this.isLoggedIn) return null;
    let token: IAuthToken = JSON.parse(localStorage.getItem('authLila')!);
   return token

  }
  getProfile(){
    return this.http.get(environment.apiUrl+"/api/Auth/profile")
  }

    updateProfile(profile:any){
    return this.http.post(environment.apiUrl+"/api/Auth/profile", profile)
  }
    forgotPassword(email: string) {
  return this.http.post(environment.apiUrl + "/api/auth/forgot-password", { email });
}

}
