import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Http } from '../../../services/http';
import { ITrip, TripTypeOptions, TripStatusOptions } from '../../../types/trip';
import { ITruck } from '../../../types/truck';
import { IDriver } from '../../../types/driver';
import { ICustomer } from '../../../types/customer';

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
    MatDatepickerModule
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
    tripStatus: this.fb.control<string>('Booked', Validators.required)
  });

  ngOnInit() {
    this.loadCustomers();
    this.httpService.getTrucks().subscribe({
      next: (trucks) => {
        this.trucks = trucks;
      },
      error: (error) => {
        console.error('Error loading trucks:', error);
      }
    });

    this.httpService.getDrivers().subscribe({
      next: (drivers) => {
        this.drivers = drivers;
      },
      error: (error) => {
        console.error('Error loading drivers:', error);
      }
    });

    if (this.data.tripId) {
      this.httpService.getTrip(this.data.tripId).subscribe({
        next: (trip: ITrip) => {
          this.tripForm.patchValue({
            customerId: trip.customerId,
            tripStartDate: new Date(trip.tripStartDate),
            tripEndDate: new Date(trip.tripEndDate),
            tripType: trip.tripType,
            truckId: trip.truckId,
            driverId: trip.driverId,
            tripStartLocation: trip.tripStartLocation,
            tripEndLocation: trip.tripEndLocation,
            approxTotalKM: trip.approxTotalKM || null,
            startKmsReading: trip.startKmsReading,
            tripStatus: trip.tripStatus
          });
        },
        error: (error) => {
          console.error('Error loading trip:', error);
        }
      });
    }
  }

  onSubmit() {
    if (!this.tripForm.valid) return;

    const formValue = this.tripForm.value;
    
    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      return date.toISOString().split('T')[0];
    };

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
      tripStatus: formValue.tripStatus!
    };

    if (this.data.tripId) {
      this.httpService.updateTrip(this.data.tripId, tripData).subscribe({
        next: () => {
          alert('Voyage modifié avec succès');
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error updating trip:', error);
          alert('Erreur lors de la modification du voyage');
        }
      });
    } else {
      this.httpService.addTrip(tripData).subscribe({
        next: () => {
          alert('Voyage ajouté avec succès');
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error adding trip:', error);
          alert('Erreur lors de l\'ajout du voyage');
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

   private loadCustomers() {
    this.httpService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        alert('Erreur lors du chargement des clients');
      }
    });
  }
}