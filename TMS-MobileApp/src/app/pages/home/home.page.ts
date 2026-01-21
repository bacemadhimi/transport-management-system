import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { ITrip } from '../../types/trip';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class HomePage implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  tripService = inject(TripService);

  trips$: Observable<ITrip[]> | null = null;
  totalDistance: number = 0;

  constructor() {}

  ngOnInit() {
    this.loadTrips();
  }

  loadTrips() {
    this.trips$ = this.tripService.getAllTrips();
    
    this.trips$.subscribe(trips => {
      this.totalDistance = this.calculateTotalDistance(trips);
    });
  }

  
  getCompletedTripsCount(): number {
   
    return 0; 
  }

  
  getPendingTripsCount(): number {
    
    return 0; 
  }

  
  getTotalDistance(): number {
    return this.totalDistance;
  }

  
  private calculateTotalDistance(trips: ITrip[]): number {
    return trips.reduce((total, trip) => total + (trip.estimatedDistance || 0), 0);
  }

  
  getTripProgress(trip: ITrip): number {
    
    switch (trip.tripStatus) {
      case 'InProgress':
        return Math.floor(Math.random() * 80) + 10; 
      case 'Completed':
        return 100;
      default:
        return 0;
    }
  }

  
  trackByTripId(index: number, trip: ITrip): number {
    return trip.id;
  }

  
  viewTripDetails(trip: ITrip) {
    console.log('Viewing trip details:', trip);
   
  }

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