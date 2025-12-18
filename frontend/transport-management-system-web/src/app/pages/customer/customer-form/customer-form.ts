import { Component, inject, OnInit } from '@angular/core';
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
export class CustomerFormComponent implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<CustomerFormComponent>);
  data = inject<{ customerId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  
  isLoading = false;
  isSubmitting = false;

  customerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9+\\s()-]{10,}$')]],
    email: ['', [Validators.email, Validators.maxLength(100)]],
    adress: ['', [Validators.maxLength(200)]]
  });

  ngOnInit() {
    if (this.data.customerId) {
      this.loadCustomer(this.data.customerId);
    }
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
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading customer:', error);
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
      phone: formValue.phone!,
      email: formValue.email || '',
      adress: formValue.adress || ''
    };

    if (this.data.customerId) {
      // Update existing customer
      // Note: You'll need to add updateCustomer method to Http service
      this.httpService.updateCustomer(this.data.customerId, customerData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.dialogRef.close(true);
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
          this.dialogRef.close(true);
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