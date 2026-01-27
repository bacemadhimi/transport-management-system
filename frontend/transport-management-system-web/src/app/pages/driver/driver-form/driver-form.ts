import { Component, ElementRef, inject, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { IDriver } from '../../../types/driver';
import { IZone } from '../../../types/zone'; 
import Swal from 'sweetalert2';
import { MatSelectModule } from '@angular/material/select';
import { Translation } from '../../../services/Translation';
import { Auth } from '../../../services/auth';

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
    MatSelectModule,
    MatProgressSpinnerModule 
  ],
  templateUrl: './driver-form.html',
  styleUrls: ['./driver-form.scss']
})
export class DriverForm implements OnInit {

     constructor(public auth: Auth) {}
     private translation = inject(Translation);
     t(key:string):string { return this.translation.t(key); }

  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<DriverForm>);
  data = inject<{ driverId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  
  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  private iti: any;
  
  isSubmitting = false;
  showingAlert = false;
  loadingZones = false; 
  zones: IZone[] = []; 
  private subscriptions: Subscription[] = []; 

  driverForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required]),
    email: this.fb.control<string>('', [Validators.required, Validators.email]),
    permisNumber: this.fb.control<string>('', [Validators.required]),
    phone: this.fb.control<string>('', [Validators.required, this.validatePhone.bind(this)]),
    status: this.fb.control<string>('Disponible', Validators.required)
     //status: this.fb.control<string>(this.t('STATUS_AVAILABLE'), Validators.required)
  });

  statuses = ['Disponible', 'En mission', 'Indisponible'];
 // statuses = [this.t('STATUS_AVAILABLE'),this.t('STATUS_ON_TRIP'),this.t('STATUS_UNAVAILABLE')];



  ngOnInit() {
    this.loadActiveZones();
    
    if (this.data.driverId) {
      this.loadDriver(this.data.driverId);
    }
  }

  ngOnDestroy() {

    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadActiveZones(): void {
    this.loadingZones = true;
    
    const zonesSub = this.httpService.getActiveZones().subscribe({
      next: (response) => {
       
        let zonesData: IZone[];
        
        if (response && typeof response === 'object' && 'data' in response) {
          zonesData = (response as any).data;
        } else if (Array.isArray(response)) {
          zonesData = response;
        } else if (response && typeof response === 'object' && 'zones' in response) {
          zonesData = (response as any).zones || (response as any).items || [];
        } else {
          zonesData = [];
        }
        
        this.zones = zonesData;
        this.loadingZones = false;
      },
      error: (error) => {
        console.error('Error loading active zones:', error);
        this.loadingZones = false;
        
      }
    });
    
    this.subscriptions.push(zonesSub);
  }

  private loadDriver(id: number) {
    const driverSub = this.httpService.getDriver(id).subscribe({
      next: (driver: IDriver) => {
        this.driverForm.patchValue({
          name: driver.name,
          email: driver.email || '',
          permisNumber: driver.permisNumber,
          phone: driver.phone?.toString() ?? "",
          status: driver.status,
          zoneId: driver.zoneId || null 
        });

        setTimeout(() => {
          if (driver.phoneCountry && this.iti) {
            this.iti.setCountry(driver.phoneCountry);
          }
          if (driver.phone) {
            this.iti.setNumber(driver.phone.toString());
          }
        }, 0);
      },
      error: (error) => {
        console.error('Error loading driver:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les informations du chauffeur',
          confirmButtonText: 'OK'
        }).then(() => this.dialogRef.close());
      }
    });
    
    this.subscriptions.push(driverSub);
  }

  onSubmit() {
    if (!this.driverForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;

    const formValue = this.driverForm.value;
    
    const value: IDriver = {
      id: this.data.driverId || 0,
      name: formValue.name!,
      email: formValue.email!,
      permisNumber: formValue.permisNumber!,
      phone: this.iti.getNumber(),
      phoneCountry: this.iti.getSelectedCountryData().iso2,
      status: formValue.status!,
      zoneId: formValue.zoneId!, 
      idCamion: 0
    };

  //   if (this.data.driverId) {
  //     this.httpService.updateDriver(this.data.driverId, value).subscribe({
  //       next: () => {
  //         this.isSubmitting = false;
  //         this.showingAlert = true;
  //         Swal.fire({
  //           icon: 'success',
  //           title: 'Chauffeur modifié avec succès',
  //           confirmButtonText: 'OK',
  //           allowOutsideClick: false,
  //           customClass: {
  //             popup: 'swal2-popup-custom',
  //             title: 'swal2-title-custom',
  //             icon: 'swal2-icon-custom',
  //             confirmButton: 'swal2-confirm-custom'
  //           }
  //         }).then(() => this.dialogRef.close(true));
  //       },
  //       error: (err) => {
  //         this.isSubmitting = false;
  //         Swal.fire({
  //           icon: 'error',
  //           title: 'Erreur',
  //           text: err?.message || 'Impossible de modifier le chauffeur',
  //           confirmButtonText: 'OK'
  //         });
  //       }
  //     });
  //   } else {
  //     this.httpService.addDriver(value).subscribe({
  //       next: () => {
  //         this.isSubmitting = false;
  //         this.showingAlert = true;
  //         Swal.fire({
  //           icon: 'success',
  //           title: 'Chauffeur ajouté avec succès',
  //           confirmButtonText: 'OK',
  //           allowOutsideClick: false,
  //           customClass: {
  //             popup: 'swal2-popup-custom',
  //             title: 'swal2-title-custom',
  //             icon: 'swal2-icon-custom',
  //             confirmButton: 'swal2-confirm-custom'
  //           }
  //         }).then(() => this.dialogRef.close(true));
  //       },
  //       error: (err) => {
  //         this.isSubmitting = false;
  //         this.handleApiError(err);
  //       }
  //     });
  //   }
  // }
   if (this.data.driverId) {
  this.httpService.updateDriver(this.data.driverId, value).subscribe({
    next: () => {
      this.isSubmitting = false;
      this.showingAlert = true;
      Swal.fire({
        icon: 'success',
        title: this.t('DRIVER_UPDATED_SUCCESS'),
        confirmButtonText: this.t('OK'),
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
        title: this.t('ERROR'),
        text: err?.message || this.t('ERROR_DEFAULT'),
        confirmButtonText: this.t('OK')
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
        title: this.t('DRIVER_ADDED_SUCCESS'),
        confirmButtonText: this.t('OK'),
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
      this.handleApiError(err);
    }
  });
}
  }

  onCancel() {
    this.dialogRef.close();
  }

  getErrorMessage(controlName: string): string {
    const control = this.driverForm.get(controlName);
    
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
    
    if (control?.hasError('email')) {
      return 'Format d\'email invalide';
    }
    
    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Le nom',
      email: 'L\'email',
      phone: 'Le téléphone',
      permisNumber: 'Le numéro de permis',
      status: 'Le statut',
      zoneId: 'La zone'
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
            utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'
          }
        );

        this.phoneInput.nativeElement.addEventListener('blur', () => {
          const number = this.iti.getNumber();
          this.driverForm.get('phone')?.setValue(number);
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

  private handleApiError(err: any) {
    let errorMessage = 'Une erreur est survenue';
    
    if (err.error && err.error.message) {
      errorMessage = err.error.message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: errorMessage,
      confirmButtonText: 'OK'
    });
  }
private handleApiError(err: any) {
  let errorMessage = 'Une erreur est survenue';
  
  
  if (err.error && err.error.message) {
    errorMessage = err.error.message;
  } else if (err.message) {
    errorMessage = err.message;
  }
  
  
  // Swal.fire({
  //   icon: 'error',
  //   title: 'Erreur',
  //   text: errorMessage,
  //   confirmButtonText: 'OK'
  // });
  Swal.fire({
  icon: 'error',
  title: this.t('ERROR'),
  text: err?.message || this.t('ERROR_DEFAULT'),
  confirmButtonText: this.t('OK')
});

}
}

