// trip-form.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule, FormArray, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { Http } from '../../../services/http';
import { ITrip, TripTypeOptions, TripStatusOptions } from '../../../types/trip';
import { ITruck } from '../../../types/truck';
import { IDriver } from '../../../types/driver';
import { ICustomer } from '../../../types/customer';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-trip-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatIconModule
  ],
  templateUrl: './trip-form.html',
  styleUrls: ['./trip-form.scss']
})
export class TripFormComponent implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<TripFormComponent>);
  data = inject<{ tripId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  trucks: ITruck[] = [];
  drivers: IDriver[] = [];
  customers: ICustomer[] = [];
  tripTypes = TripTypeOptions;
  tripStatuses = TripStatusOptions;
  
  tripForm = this.fb.group({
    customerId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    tripStartDate: this.fb.control<Date | null>(null, Validators.required),
    tripEndDate: this.fb.control<Date | null>(null, Validators.required),
    tripType: this.fb.control<string>('SingleTrip', Validators.required),
    truckId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    driverId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    tripStartLocation: this.fb.control<string>('', Validators.required),
    tripEndLocation: this.fb.control<string>('', Validators.required),
    approxTotalKM: this.fb.control<number | null>(null),
    startKmsReading: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
    tripStatus: this.fb.control<string>('Booked', Validators.required),
    pickupLocations: this.fb.array<string>([])
  });

  get pickupLocations(): FormArray {
    return this.tripForm.get('pickupLocations') as FormArray;
  }

  ngOnInit() {
    this.loadCustomers();
    this.loadTrucks();
    this.loadDrivers();
    
    // Add first pickup location field by default
    this.addPickupLocation();
    
    if (this.data.tripId) {
      this.loadTrip();
    }
  }

// trip-form.component.ts

addPickupLocation() {
  // Sauvegarder l'état actuel
  const currentStatus = this.tripForm.status;
  
  const locationControl = this.fb.control('');
  this.pickupLocations.push(locationControl);
  
  // Réinitialiser l'état de validation pour éviter les erreurs immédiates
  this.pickupLocations.controls.forEach(control => {
    control.setErrors(null);
  });
  
  // Forcer une nouvelle validation
  this.tripForm.updateValueAndValidity({ onlySelf: false, emitEvent: false });
}

  removePickupLocation(index: number) {
    this.pickupLocations.removeAt(index);
  }

  private loadCustomers() {
    this.httpService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error?.message || 'Erreur lors du chargement des clients',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  private loadTrucks() {
    this.httpService.getTrucks().subscribe({
      next: (trucks) => {
        this.trucks = trucks;
      },
      error: (error) => {
        console.error('Error loading trucks:', error);
      }
    });
  }

  private loadDrivers() {
    this.httpService.getDrivers().subscribe({
      next: (drivers) => {
        this.drivers = drivers;
      },
      error: (error) => {
        console.error('Error loading drivers:', error);
      }
    });
  }

  private loadTrip() {
    this.httpService.getTrip(this.data.tripId!).subscribe({
      next: (trip: ITrip) => {
        const startDate = new Date(trip.tripStartDate);
        const endDate = new Date(trip.tripEndDate);
        
        this.tripForm.patchValue({
          customerId: trip.customerId,
          tripStartDate: isNaN(startDate.getTime()) ? null : startDate,
          tripEndDate: isNaN(endDate.getTime()) ? null : endDate,
          tripType: trip.tripType,
          truckId: trip.truckId,
          driverId: trip.driverId,
          tripStartLocation: trip.tripStartLocation,
          tripEndLocation: trip.tripEndLocation,
          approxTotalKM: trip.approxTotalKM || null,
          startKmsReading: trip.startKmsReading,
          tripStatus: trip.tripStatus
        });
        
        // Clear existing pickup locations
        while (this.pickupLocations.length > 0) {
          this.pickupLocations.removeAt(0);
        }
        
        // Add pickup locations from trip (simplified - just add all locations as pickup)
        if (trip.locations && trip.locations.length > 0) {
          trip.locations.forEach((location, index) => {
            const locationControl = this.fb.control(location.address, Validators.required);
            this.pickupLocations.push(locationControl);
          });
        } else {
          // Add at least one location if none exist
          this.addPickupLocation();
        }
      },
      error: (error) => {
        console.error('Error loading trip:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error?.message || 'Erreur lors du chargement du voyage',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  onSubmit() {
    if (!this.tripForm.valid) {
      // Mark all fields as touched to show errors
      Object.keys(this.tripForm.controls).forEach(key => {
        const control = this.tripForm.get(key);
        control?.markAsTouched();
      });
      // Mark all pickup locations as touched
      this.pickupLocations.controls.forEach(control => {
        control.markAsTouched();
      });
      return;
    }

    const formValue = this.tripForm.value;
    
    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const locations = (formValue.pickupLocations || [])
    .map((address: string | null, index: number) => ({
      address: address || '', // Handle null case by converting to empty string
      sequence: index + 1,
      locationType: 'Pickup', // Default all to Pickup
      scheduledTime: undefined,
      notes: undefined
    }))

    const tripData: ITrip = {
      id: this.data.tripId || 0,
      customerId: formValue.customerId!,
      tripStartDate: formatDate(formValue.tripStartDate!),
      tripEndDate: formatDate(formValue.tripEndDate!),
      tripType: formValue.tripType!,
      truckId: formValue.truckId!,
      driverId: formValue.driverId!,
      tripStartLocation: formValue.tripStartLocation!,
      tripEndLocation: formValue.tripEndLocation!,
      approxTotalKM: formValue.approxTotalKM || undefined,
      startKmsReading: formValue.startKmsReading!,
      tripStatus: formValue.tripStatus!,
      locations: locations
    };

    if (this.data.tripId) {
      this.httpService.updateTrip(this.data.tripId, tripData).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Voyage modifié avec succès',
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            customClass: {
              popup: 'swal2-popup-custom',
              title: 'swal2-title-custom',
              icon: 'swal2-icon-custom',
              confirmButton: 'swal2-confirm-custom'
            }
          }).then(() => this.dialogRef.close(true));
        },
        error: (error) => {
          console.error('Error updating trip:', error);
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: error?.message || 'Erreur lors de la modification du voyage',
            confirmButtonText: 'OK'
          });
        }
      });
    } else {
      this.httpService.addTrip(tripData).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Voyage ajouté avec succès',
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            customClass: {
              popup: 'swal2-popup-custom',
              title: 'swal2-title-custom',
              icon: 'swal2-icon-custom',
              confirmButton: 'swal2-confirm-custom'
            }
          }).then(() => this.dialogRef.close(true));
        },
        error: (error) => {
          console.error('Error adding trip:', error);
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: error?.message || 'Erreur lors de l\'ajout du voyage',
            confirmButtonText: 'OK'
          });
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}