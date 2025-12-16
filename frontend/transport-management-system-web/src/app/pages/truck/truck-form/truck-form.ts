import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { ITruck } from '../../../types/truck';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';


@Component({
  selector: 'app-truck-form',
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
  templateUrl: './truck-form.html',
  styleUrls: ['./truck-form.scss']
})
export class TruckForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<TruckForm>);
  data = inject<{ truckId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

truckForm = this.fb.group({
    immatriculation: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
    brand: this.fb.control<string>('', Validators.required),
    capacity: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    technicalVisitDate: this.fb.control<Date | null>(null, Validators.required),
    status: this.fb.control<string>('Disponible', Validators.required),
    color: this.fb.control<string>('#ffffff', Validators.required)
  });

  statuses = ['Disponible', 'En mission', 'En panne'];

ngOnInit() {
  if (this.data.truckId) {
    this.httpService.getTruck(this.data.truckId).subscribe((truck: ITruck) => {

      const dateValue = truck.technicalVisitDate
        ? new Date(truck.technicalVisitDate)
        : null;

      this.truckForm.patchValue({
        immatriculation: truck.immatriculation,
        brand: truck.brand,
        capacity: truck.capacity,
        technicalVisitDate: dateValue,   
        status: truck.status,
        color: truck.color || '#ffffff'
      });
    });
  }
}


onSubmit() {
  if (!this.truckForm.valid) return;

  const selectedDate: Date | null = this.truckForm.value.technicalVisitDate ?? null;

  const technicalVisitDate = selectedDate
    ? `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`
    : null;

  const value: ITruck = {
    id: this.data.truckId || 0,
    immatriculation: this.truckForm.value.immatriculation!,
    brand: this.truckForm.value.brand!,
    capacity: this.truckForm.value.capacity!,
    technicalVisitDate: technicalVisitDate, 
    status: this.truckForm.value.status!,
    color: this.truckForm.value.color!
  };

  if (this.data.truckId) {
    this.httpService.updateTruck(this.data.truckId, value).subscribe(() => {
      alert("Camion modifié avec succès");
      this.dialogRef.close(true);
    });
  } else {
    this.httpService.addTruck(value).subscribe(() => {
      alert("Camion ajouté avec succès");
      this.dialogRef.close(true);
    });
  }
}


  onCancel() {
    this.dialogRef.close();
  }
}
