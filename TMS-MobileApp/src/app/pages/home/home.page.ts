import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { ITrip, TripStatus } from '../../types/trip';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
  toastController = inject(ToastController);

  trips$: Observable<ITrip[]> | null = null;
  totalDistance: number = 0;

  constructor() {}

  ngOnInit() {
    this.loadTrips();
  }

  loadTrips() {
    const userEmail = this.authService.currentUser()?.email;
    this.trips$ = this.tripService.getAllTrips().pipe(
      map(trips => {
        if (userEmail) {
          return trips.filter(trip => trip.driver?.email === userEmail);
        }
        return trips;
      })
    );
    console.log('Loaded trips:', this.trips$);
    
    this.trips$.subscribe(trips => {
      console.log('Trips data:', trips);
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
      case TripStatus.LoadingInProgress:
      case TripStatus.DeliveryInProgress:
        return Math.floor(Math.random() * 80) + 10;
      case TripStatus.Receipt:
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

  updateTripStatus(trip: ITrip, newStatus: string) {
    const oldStatus = trip.tripStatus;
    trip.updating = true;
    // Optimistic update: change status immediately
    trip.tripStatus = newStatus as TripStatus;
    this.tripService.updateTripStatus(trip.id, { status: newStatus }).subscribe({
      next: async (response) => {
        console.log('Status updated successfully', response);
        trip.updating = false;
        const toast = await this.toastController.create({
          message: 'Trip status updated successfully',
          duration: 2000,
          color: 'success'
        });
        toast.present();
      },
      error: async (err) => {
        console.error('Error updating trip status', err);
        trip.updating = false;
        trip.tripStatus = oldStatus; // Revert on error
        const toast = await this.toastController.create({
          message: 'Failed to update trip status',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
      }
    });
  }
  goToProfile() {
    this.router.navigate(['/profile']);
  }
}