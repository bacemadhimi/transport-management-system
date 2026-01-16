import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class HomePage {
  authService = inject(AuthService);
  router = inject(Router);

  constructor() {}

  logout() {
    this.authService.logout();
  }

  navigateToProfile() {
   
    console.log('Navigate to profile');
  }

  navigateToTrips() {
  
    console.log('Navigate to trips');
  }
}