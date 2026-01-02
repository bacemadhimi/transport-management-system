import { Component, OnInit, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Http } from '../../../services/http';
import { ICreateTrajectDto, ITraject } from '../../../types/traject';

@Component({
  selector: 'app-traject-form-simple',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <mat-card class="traject-form-simple-card">
      <header class="traject-form-simple-header">
        <div>
          <h1>Créer un nouveau traject</h1> 
         
       </div>
       
      </header>

      <div class="loading-overlay" *ngIf="loading">
        <mat-spinner diameter="50"></mat-spinner>
        <span>Chargement...</span>
      </div>

      <form [formGroup]="trajectForm" (ngSubmit)="onSubmit()">
        <!-- Nom du traject -->
        <mat-form-field appearance="outline" class="traject-field full-width">
         
          <input
            matInput
            formControlName="name"
            placeholder="Ex: Paris-Lyon-Marseille"
            maxlength="100"
          />
          <mat-error *ngIf="trajectForm.get('name')?.hasError('required')">
            Le nom est obligatoire
          </mat-error>
          <mat-hint>{{ trajectForm.get('name')?.value?.length || 0 }}/100 caractères</mat-hint>
        </mat-form-field>

        <!-- Section des points -->
        <div class="points-section" formArrayName="points">
          <div class="section-header">
            <h3>Points de passage</h3>
            <div class="section-header-actions">
              <button type="button" mat-stroked-button (click)="addPoint()">
                <mat-icon>add_location</mat-icon>
                Ajouter un point
              </button>
            </div>
          </div>

          <!-- Liste des points -->
          <div class="points-list" *ngIf="points.length > 0">
            <div *ngFor="let pointGroup of pointControls; let i = index"
                 [formGroupName]="i"
                 class="point-card">
              
              <div class="point-card-header">
                <div class="point-order-display">
                  <div class="order-circle">{{ pointGroup.get('order')?.value }}</div>
                  <div class="point-title">Point {{ i + 1 }}</div>
                </div>
                
                <div class="point-actions">
                  <button mat-icon-button type="button"
                          (click)="removePoint(i)"
                          *ngIf="points.length > 1"
                          matTooltip="Supprimer ce point">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>

              <div class="point-form-fields">
                <!-- Localisation -->
                <mat-form-field appearance="outline" class="point-field full-width">
                 
                  <textarea
                    matInput
                    formControlName="location"
                    placeholder="Ex: 123 Rue de la Paix, 75001 Paris"
                    rows="2"
                  ></textarea>
                  <mat-hint>Adresse complète du point de passage</mat-hint>
                  <mat-error *ngIf="pointGroup.get('location')?.hasError('required')">
                    La localisation est obligatoire
                  </mat-error>
                </mat-form-field>
              </div>
            </div>
          </div>

          <!-- État vide -->
          <div *ngIf="points.length === 0" class="empty-points">
            <mat-icon class="empty-icon">location_off</mat-icon>
            <h4>Aucun point défini</h4>
            <p>Commencez par ajouter les points de passage de votre traject</p>
            <button mat-raised-button color="primary" type="button" (click)="addPoint()">
              <mat-icon>add_location</mat-icon>
              Ajouter le premier point
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="form-footer">
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="trajectForm.invalid || points.length === 0 || loading"
          >
            <span *ngIf="loading">Envoi en cours...</span>
            <span *ngIf="!loading">Créer le traject</span>
          </button>
          <button mat-button type="button" (click)="onCancel()" [disabled]="loading">
            Annuler
          </button>
        </div>
      </form>
    </mat-card>
  `,
  styleUrls: ['./traject-form-simple.component.scss']
})
export class TrajectFormSimpleComponent implements OnInit {
  trajectForm!: FormGroup;
  points: FormArray;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private http: Http,
    private dialogRef: MatDialogRef<TrajectFormSimpleComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { onTrajectCreated: (traject: ITraject) => void }
  ) {
    this.points = this.fb.array([]);
  }

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.trajectForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      points: this.points
    });

    // Ajouter un point par défaut
    this.addPoint();
  }

  // Gestion des points
  get pointControls(): FormGroup[] {
    return this.points.controls as FormGroup[];
  }

  addPoint(pointData?: any): void {
    const order = this.points.length + 1;
    const pointGroup = this.fb.group({
      location: [pointData?.location || '', Validators.required],
      order: [pointData?.order || order, [Validators.required, Validators.min(1)]]
    });

    this.points.push(pointGroup);
  }

  removePoint(index: number): void {
    this.points.removeAt(index);
    // Mettre à jour les ordres
    this.updatePointOrders();
  }

  updatePointOrders(): void {
    this.pointControls.forEach((group, index) => {
      group.get('order')?.setValue(index + 1, { emitEvent: false });
    });
  }

  // Soumission du formulaire
  onSubmit(): void {
    if (this.trajectForm.invalid || this.points.length === 0) {
      this.markFormGroupTouched(this.trajectForm);
      this.pointControls.forEach(group => this.markFormGroupTouched(group));
      
      if (this.points.length === 0) {
        this.snackBar.open('Ajoutez au moins un point', 'Fermer', { duration: 3000 });
      }
      return;
    }

    const formValue = this.trajectForm.value;
    
    // Préparer les points
    const points = this.pointControls.map((group, index) => ({
      location: group.value.location,
      order: parseInt(group.value.order) || (index + 1)
    }));

    const trajectData: ICreateTrajectDto = {
      name: formValue.name,
      points: points
    };

    this.loading = true;
    this.http.createTraject(trajectData).subscribe({
      next: (traject: ITraject) => {
        this.snackBar.open('Traject créé avec succès', 'Fermer', { duration: 3000 });
        
        // Appeler le callback pour rafraîchir la liste
        if (this.data.onTrajectCreated) {
          this.data.onTrajectCreated(traject);
        }
        
        this.dialogRef.close(traject);
        this.loading = false;
      },
      error: (error) => {
        console.error('Create traject error:', error);
        this.snackBar.open('Erreur lors de la création du traject', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  // Validation helper
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