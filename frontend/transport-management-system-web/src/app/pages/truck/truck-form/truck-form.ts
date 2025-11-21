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
    MatSelectModule
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
    immatriculation: ['', [Validators.required, Validators.minLength(2)]],
    brand: ['', [Validators.required]],
    capacity: [0, [Validators.required, Validators.min(1)]],
    technicalVisitDate: ['', [Validators.required]],
    status: ['Disponible', Validators.required]
  });

  statuses = ['Disponible', 'En mission', 'En panne'];

  ngOnInit() {
    if (this.data.truckId) {
      this.httpService.getTruck(this.data.truckId).subscribe((truck: ITruck) => {
        this.truckForm.patchValue({
          immatriculation: truck.immatriculation,
          brand: truck.brand,
          capacity: truck.capacity,
          technicalVisitDate: truck.technicalVisitDate,
          status: truck.status
        });
      });
    }
  }

  onSubmit() {
    if (!this.truckForm.valid) return;

    const value: any = this.truckForm.value;

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
