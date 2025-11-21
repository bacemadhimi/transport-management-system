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
    if (!this.driverForm.valid) return;

    const value: IDriver = {
      id: this.data.driverId || 0,
      name: this.driverForm.value.name!,
      permisNumber: this.driverForm.value.permisNumber!,
      phone: Number(this.driverForm.value.phone!),  
      status: this.driverForm.value.status!,
      idCamion: 0 
    };

    if (this.data.driverId) {
      this.httpService.updateDriver(this.data.driverId, value).subscribe(() => {
        alert("Chauffeur modifié avec succès");
        this.dialogRef.close(true);
      });
    } else {
      this.httpService.addDriver(value).subscribe(() => {
        alert("Chauffeur ajouté avec succès");
        this.dialogRef.close(true);
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
