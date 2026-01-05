import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Http } from '../../../services/http';
import { ILocation, ICreateLocationDto, IUpdateLocationDto } from '../../../types/location';
import Swal from 'sweetalert2';

interface DialogData {
  locationId?: number;
}

@Component({
  selector: 'app-location-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './location-form.html',
  styleUrls: ['./location-form.scss']
})
export class LocationFormComponent implements OnInit {
  locationForm!: FormGroup;
  loading = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private http: Http,
    private dialogRef: MatDialogRef<LocationFormComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    if (this.data.locationId) {
      this.loadLocation(this.data.locationId);
    }
  }

  private initForm(): void {
    this.locationForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      isActive: [true]
    });
  }

private loadLocation(locationId: number): void {
  this.loading = true;

  this.http.getLocation(locationId).subscribe({
    next: (response) => {
      this.locationForm.patchValue({
        name: response.data.name,
        isActive: response.data.isActive
      });
      this.loading = false;
    },
    error: (error) => {
      console.error('Error loading location:', error);
      this.snackBar.open(
        'Erreur lors du chargement de la location',
        'Fermer',
        { duration: 3000 }
      );
      this.loading = false;
      this.dialogRef.close();
    }
  });
}



  onSubmit(): void {
    if (this.locationForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const formValue = this.locationForm.value;
    
    if (this.data.locationId) {
      this.updateLocation(formValue);
    } else {
      this.createLocation(formValue);
    }
  }

  private createLocation(formValue: any): void {
    const locationData: ICreateLocationDto = {
      name: formValue.name.trim(),
      isActive: formValue.isActive
    };

    this.http.createLocation(locationData).subscribe({
      next: (location: ILocation) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: 'lieu créée avec succès',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            icon: 'swal2-icon-custom',
            confirmButton: 'swal2-confirm-custom'
          }
        }).then(() => this.dialogRef.close(location));
      },
      error: (error) => {
        console.error('Create location error:', error);
        const errorMessage = error.error?.message || 'Erreur lors de la création de la location';
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
        this.isSubmitting = false;
      }
    });
  }

  private updateLocation(formValue: any): void {
    const locationData: IUpdateLocationDto = {
      name: formValue.name.trim(),
      isActive: formValue.isActive
    };

    this.http.updateLocation(this.data.locationId!, locationData).subscribe({
      next: (location: ILocation) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: 'lieu modifiée avec succès',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            icon: 'swal2-icon-custom',
            confirmButton: 'swal2-confirm-custom'
          }
        }).then(() => this.dialogRef.close(location));
      },
      error: (error) => {
        console.error('Update location error:', error);
        const errorMessage = error.error?.message || 'Erreur lors de la modification de la location';
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
        this.isSubmitting = false;
      }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.locationForm.get(controlName);
    
    if (control?.hasError('required')) {
      return 'Le nom du lieu est obligatoire';
    }
    
    if (control?.hasError('maxlength')) {
      return 'Le nom ne peut pas dépasser 100 caractères';
    }
    
    return '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}