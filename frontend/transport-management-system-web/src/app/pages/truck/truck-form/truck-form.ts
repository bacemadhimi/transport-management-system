import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
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
import { MatIconModule } from '@angular/material/icon'; 
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';


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
    MatDatepickerModule,
    MatIconModule, 
    MatTooltipModule
  ],
  templateUrl: './truck-form.html',
  styleUrls: ['./truck-form.scss']
})

export class TruckForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<TruckForm>);
  data = inject<{ truckId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  @ViewChild('fileInput') fileInput!: ElementRef;
  
imageBase64: string | null = null;
imagePreview: string | null = null;
fileError: string | null = null;
originalImageBase64: string | null = null; 
hasExistingImage = false;
selectedFile: File | null = null;


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
       if (truck.imageBase64) {
        this.imageBase64 = truck.imageBase64;
        this.imagePreview = `data:image/png;base64,${truck.imageBase64}`;
      }
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
    color: this.truckForm.value.color!,
    imageBase64: this.imageBase64
  };

  if (this.data.truckId) {
    this.httpService.updateTruck(this.data.truckId, value).subscribe(() => {
      Swal.fire({
        icon: 'success',
        title: 'Camion modifié avec succès',
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        customClass: {
          popup: 'swal2-popup-custom',
          title: 'swal2-title-custom',
          icon: 'swal2-icon-custom',
          confirmButton: 'swal2-confirm-custom'
        }
      }).then(() => this.dialogRef.close(true));
    }, (err) => {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: err?.message || 'Impossible de modifier le camion',
        confirmButtonText: 'OK'
      });
    });
  } else {
    this.httpService.addTruck(value).subscribe(() => {
      Swal.fire({
        icon: 'success',
        title: 'Camion ajouté avec succès',
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        customClass: {
          popup: 'swal2-popup-custom',
          title: 'swal2-title-custom',
          icon: 'swal2-icon-custom',
          confirmButton: 'swal2-confirm-custom'
        }
      }).then(() => this.dialogRef.close(true));
    }, (err) => {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: err?.message || 'Impossible d\'ajouter le camion',
        confirmButtonText: 'OK'
      });
    });
  }
}


  onCancel() {
    this.dialogRef.close();
  }
  onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
   const maxSize = 2 * 1024 * 1024; // 2MB

  if (file.size > maxSize) {
    this.fileError = 'Image trop volumineuse (max 2MB).';
    this.imagePreview = null;
    this.imageBase64 = null;
    return;
  }
    this.fileError = null;
  const reader = new FileReader();
  reader.onload = () => {
    this.imagePreview = reader.result as string;
    this.imageBase64 = this.imagePreview.split(',')[1]; 
  };
  reader.readAsDataURL(file);
}

 onDeletePhoto() {
    if (confirm('Voulez-vous vraiment supprimer cette photo ?')) {
      this.imagePreview = null;
      this.imageBase64 = null;
      this.selectedFile = null;
      this.resetFileInput();
      
    
      if (this.hasExistingImage && this.originalImageBase64) {
        this.imageBase64 = ''; 
      }
    }
  }

 
  private resetFileInput() {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

 
  get hasPhoto(): boolean {
    return !!this.imagePreview || this.hasExistingImage;
  }

 
  get isPhotoChanged(): boolean {
    return this.imageBase64 !== this.originalImageBase64;
  }
}
