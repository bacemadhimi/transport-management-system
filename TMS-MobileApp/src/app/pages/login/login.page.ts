import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ILoginRequest } from '../../types/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage {
  router = inject(Router);
  authService = inject(AuthService);

  
  loginData: ILoginRequest = {
    email: '',
    password: ''
  };

 
  isLoading = signal(false);
  errorMessage = signal('');

  constructor() {}

  async onLogin() {
    if (!this.loginData.email || !this.loginData.password) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const token = await this.authService.login(this.loginData);
      console.log('Login successful:', token);
     
      this.router.navigate(['/home']);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Login failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  navigateToRegister() {
  
    console.log('Navigate to register');
  }
}