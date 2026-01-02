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
  template: `
    <mat-card class="location-form-card">
      <header class="location-form-header">
        <div>
          <h2>{{ data.locationId ? 'Modifier location' : 'Ajouter location' }}</h2>
          <p class="text-sm text-gray-500">
            {{ data.locationId ? 'Mettre à jour les informations de la location' : 'Créer une nouvelle location' }}
          </p>
        </div>
      </header>

      <form [formGroup]="locationForm" (ngSubmit)="onSubmit()">
        <!-- Name Field -->
        <mat-form-field appearance="outline" class="full-width">
          
          <input
            matInput
            formControlName="name"
            placeholder="Ex: Entrepôt principal"
            maxlength="100"
          />
          <mat-error *ngIf="locationForm.get('name')?.hasError('required')">
            Le nom est obligatoire
          </mat-error>
          <mat-error *ngIf="locationForm.get('name')?.hasError('maxlength')">
            Maximum 100 caractères
          </mat-error>
          <mat-hint>{{ locationForm.get('name')?.value?.length || 0 }}/100 caractères</mat-hint>
        </mat-form-field>

        <!-- Active Status -->
        <div class="status-section">
          <mat-slide-toggle
            formControlName="isActive"
            color="primary"
            class="status-toggle"
          >
            <div class="status-label">
              <mat-icon>{{ locationForm.get('isActive')?.value ? 'toggle_on' : 'toggle_off' }}</mat-icon>
              <span>{{ locationForm.get('isActive')?.value ? 'Actif' : 'Inactif' }}</span>
            </div>
          </mat-slide-toggle>
          <p class="status-hint">
            un lieu inactive ne sera pas disponible dans les listes de sélection
          </p>
        </div>

        <!-- Footer -->
        <div class="form-footer">
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="locationForm.invalid || loading"
          >
            <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
            <span *ngIf="!loading">{{ data.locationId ? 'Enregistrer' : 'Créer' }}</span>
            <span *ngIf="loading">En cours...</span>
          </button>
          
          <button mat-button type="button" (click)="onCancel()" [disabled]="loading">
            Annuler
          </button>
        </div>
      </form>
    </mat-card>
  `,
  styleUrls: ['./location-form.scss']
})
export class LocationFormComponent implements OnInit {
  locationForm!: FormGroup;
  loading = false;

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
      next: (location: ILocation) => {
        this.locationForm.patchValue({
          name: location.name,
          isActive: location.isActive
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading location:', error);
        this.snackBar.open('Erreur lors du chargement de la location', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.locationForm.invalid) {
      this.markFormGroupTouched(this.locationForm);
      return;
    }

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

    this.loading = true;
    this.http.createLocation(locationData).subscribe({
      next: (location: ILocation) => {
        this.snackBar.open('Location créée avec succès', 'Fermer', { duration: 3000 });
        this.dialogRef.close(location);
        this.loading = false;
      },
      error: (error) => {
        console.error('Create location error:', error);
        const errorMessage = error.error?.message || 'Erreur lors de la création de la location';
        this.snackBar.open(errorMessage, 'Fermer', { duration: 5000 });
        this.loading = false;
      }
    });
  }

  private updateLocation(formValue: any): void {
    const locationData: IUpdateLocationDto = {
      name: formValue.name.trim(),
      isActive: formValue.isActive
    };

    this.loading = true;
    this.http.updateLocation(this.data.locationId!, locationData).subscribe({
      next: (location: ILocation) => {
        this.snackBar.open('Location modifiée avec succès', 'Fermer', { duration: 3000 });
        this.dialogRef.close(location);
        this.loading = false;
      },
      error: (error) => {
        console.error('Update location error:', error);
        const errorMessage = error.error?.message || 'Erreur lors de la modification de la location';
        this.snackBar.open(errorMessage, 'Fermer', { duration: 5000 });
        this.loading = false;
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}