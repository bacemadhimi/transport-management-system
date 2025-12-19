import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { IDriver } from '../../../types/driver';
import Swal from 'sweetalert2';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-driver-form',
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
  templateUrl: './driver-form.html',
  styleUrls: ['./driver-form.scss']
})
export class DriverForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<DriverForm>);
  data = inject<{ driverId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  isSubmitting = false;
  showingAlert = false;

  driverForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required]),
    permisNumber: this.fb.control<string>('', [Validators.required]),
    phone: this.fb.control<string>('', [Validators.required]),
    status: this.fb.control<string>('Disponible', Validators.required)
  });

  statuses = ['Disponible', 'En mission', 'Indisponible'];

  ngOnInit() {
    console.log(this.data)
  if (this.data.driverId) {
    this.httpService.getDriver(this.data.driverId).subscribe((driver: IDriver) => {

      console.log("Driver returned from API:", driver);  

      this.driverForm.patchValue({
        name: driver.name,
        permisNumber: driver.permisNumber,
        phone: driver.phone?.toString() ?? "",
        status: driver.status
      });
    });
  }
}


  onSubmit() {
    if (!this.driverForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;

    const value: IDriver = {
      id: this.data.driverId || 0,
      name: this.driverForm.value.name!,
      permisNumber: this.driverForm.value.permisNumber!,
      phone: Number(this.driverForm.value.phone!),
      status: this.driverForm.value.status!,
      idCamion: 0
    };

    if (this.data.driverId) {
      this.httpService.updateDriver(this.data.driverId, value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showingAlert = true;
          Swal.fire({
            icon: 'success',
            title: 'Chauffeur modifié avec succès',
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
        error: (err) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: err?.message || 'Impossible de modifier le chauffeur',
            confirmButtonText: 'OK'
          });
        }
      });
    } else {
      this.httpService.addDriver(value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showingAlert = true;
          Swal.fire({
            icon: 'success',
            title: 'Chauffeur ajouté avec succès',
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
        error: (err) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: err?.message || 'Impossible d\'ajouter le chauffeur',
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
