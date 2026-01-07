import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Http } from '../../../services/http';
import { ICustomer } from '../../../types/customer';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customer-form',
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
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './customer-form.html',
  styleUrls: ['./customer-form.scss']
})
export class CustomerFormComponent implements OnInit, AfterViewInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<CustomerFormComponent>);
  data = inject<{ customerId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  private iti: any; // intl-tel-input instance

  isLoading = false;
  isSubmitting = false;
  showingAlert = false;

  customerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: ['', [Validators.required, this.validatePhone.bind(this)]],
    email: ['', [Validators.email, Validators.maxLength(100)]],
    adress: ['', [Validators.maxLength(200)]],
    matricule: ['', [Validators.maxLength(50)]]
  });

  ngOnInit() {
    if (this.data.customerId) {
      this.loadCustomer(this.data.customerId);
    }
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
        this.customerForm.get('phone')?.setValue(number);
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

private loadCustomer(id: number) {
  this.isLoading = true;

  this.httpService.getCustomer(id).subscribe({
    next: (customer: ICustomer) => {
      this.customerForm.patchValue({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        adress: customer.adress || ''
      });

      
      setTimeout(() => {
        if (customer.phoneCountry && this.iti) {
          this.iti.setCountry(customer.phoneCountry);
        }
        if (customer.phone) {
          this.iti.setNumber(customer.phone);
        }
      }, 0);

      this.isLoading = false;
    },
    error: () => {
      this.isLoading = false;
      this.dialogRef.close();
    }
  });
}


  onSubmit() {
    if (!this.customerForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;
    const formValue = this.customerForm.value;
    
    const customerData = {
      name: formValue.name!,
      phone: this.iti.getNumber(), 
      phoneCountry: this.iti.getSelectedCountryData().iso2, 
      email: formValue.email || '',
      adress: formValue.adress || '',
      matricule: formValue.matricule || ''
    };

    if (this.data.customerId) {
      this.httpService.updateCustomer(this.data.customerId, customerData).subscribe({
        next: () => {
          this.isSubmitting = false;
            this.showingAlert = true;
            Swal.fire({
              icon: 'success',
              title: 'Client modifié avec succés',
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
        error: (error) => {
          console.error('Error updating customer:', error);
          this.isSubmitting = false;
        }
      });
    } else {
      this.httpService.addCustomer(customerData).subscribe({
        next: () => {
          this.isSubmitting = false;
            this.showingAlert = true;
            Swal.fire({
              icon: 'success',
              title: 'Client ajouté avec succès',
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
        error: (error) => {
          console.error('Error creating customer:', error);
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  getErrorMessage(controlName: string): string {
    const control = this.customerForm.get(controlName);
    
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} est obligatoire`;
    }
    
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} doit comporter au moins ${requiredLength} caractères`;
    }
    
    if (control?.hasError('maxlength')) {
      const requiredLength = control.errors?.['maxlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} ne peut pas dépasser ${requiredLength} caractères`;
    }
    
    if (control?.hasError('pattern')) {
      return 'Format de téléphone invalide';
    }
    
    if (control?.hasError('email')) {
      return 'Veuillez entrer une adresse email valide';
    }
    
    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Le nom',
      phone: 'Le téléphone',
      email: 'L\'email',
      adress: 'L\'adresse'
    };
    return labels[controlName] || controlName;
  }

  get isEditing(): boolean {
    return !!this.data.customerId;
  }
}
