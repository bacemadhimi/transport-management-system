import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';

import Swal from 'sweetalert2';
import { MatSelectModule } from '@angular/material/select';
import { IConvoyeur } from '../../../types/convoyeur';

@Component({
  selector: 'app-convoyeur-form',
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
  templateUrl: './convoyeur-form.html',
  styleUrls: ['./convoyeur-form.scss']
})
export class ConvoyeurForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<ConvoyeurForm>);
  data = inject<{ convoyeurId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
 @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  private iti: any; 
  isSubmitting = false;
  showingAlert = false;

  convoyeurForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required]),
    permisNumber: this.fb.control<string>('', [Validators.required]),
    phone: this.fb.control<string>('', [Validators.required, this.validatePhone.bind(this)]),
    status: this.fb.control<string>('Disponible', Validators.required)
  });

  statuses = ['Disponible', 'En mission', 'Indisponible'];

  ngOnInit() {
  if (this.data.convoyeurId) {
      this.loadConvoyeur(this.data.convoyeurId);
    }

}


  onSubmit() {
    if (!this.convoyeurForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;

    const value: IConvoyeur = {
      id: this.data.convoyeurId || 0,
      name: this.convoyeurForm.value.name!,
      permisNumber: this.convoyeurForm.value.permisNumber!,
      phone: this.iti.getNumber(), 
      phoneCountry: this.iti.getSelectedCountryData().iso2,
      status: this.convoyeurForm.value.status!,
      idCamion: 0
    };

    if (this.data.convoyeurId) {
      this.httpService.updateConvoyeur(this.data.convoyeurId, value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showingAlert = true;
          Swal.fire({
            icon: 'success',
            title: 'Convoyeur modifié avec succès',
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
      this.httpService.addConvoyeur(value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showingAlert = true;
          Swal.fire({
            icon: 'success',
            title: 'Convoyeur ajouté avec succès',
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
  getErrorMessage(controlName: string): string {
    const control = this.convoyeurForm.get(controlName);
    
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} est obligatoire`;
    }
    
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} doit comporter au moins ${requiredLength} caractères`;
    }
    
    if (control?.hasError('pattern')) {
      return 'Format de téléphone invalide';
    }
    
    return '';
  }

private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Le nom',
      phone: 'Le téléphone',
      permisNumber: 'Le numéro de permis',
      status: 'Le statut'
    };
    return labels[controlName] || controlName;
  }
ngAfterViewInit() {
  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });

  const loadCSS = (href: string) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  
  loadCSS(
    'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/css/intlTelInput.min.css'
  );

  loadScript(
    'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/intlTelInput.min.js'
  )
    .then(() =>
      loadScript(
        'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'
      )
    )
    .then(() => {
      this.iti = (window as any).intlTelInput(
        this.phoneInput.nativeElement,
        {
          initialCountry: 'tn',
          separateDialCode: true,
          nationalMode: false,
          formatOnDisplay: true,

          
          utilsScript:
            'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'
        }
      );

      this.phoneInput.nativeElement.addEventListener('blur', () => {
        const number = this.iti.getNumber();
        this.convoyeurForm.get('phone')?.setValue(number);
      });
    })
    .catch(() => {
      console.error('Failed to load intl-tel-input scripts.');
    });
}


  private validatePhone(control: any) {
    if (!this.iti) return null;
    return this.iti.isValidNumber() ? null : { pattern: true };
  }
  private loadConvoyeur(id: number) {
    this.httpService.getConvoyeur(id).subscribe((convoyeur: IConvoyeur) => {
      this.convoyeurForm.patchValue({
        name: convoyeur.name,
        permisNumber: convoyeur.permisNumber,
        phone: convoyeur.phone?.toString() ?? "",
        status: convoyeur.status
      });

      
      setTimeout(() => {
        if (convoyeur.phoneCountry && this.iti) {
          this.iti.setCountry(convoyeur.phoneCountry);
        }
        if (convoyeur.phone) {
          this.iti.setNumber(convoyeur.phone.toString());
        }
      }, 0);
    });
  }

}

