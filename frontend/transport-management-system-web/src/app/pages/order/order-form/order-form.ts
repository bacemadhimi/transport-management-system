import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { Http } from '../../../services/http';
import { CreateOrderDto, IOrder, OrderStatus } from '../../../types/order';
import Swal from 'sweetalert2';
import { ICustomer } from '../../../types/customer';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';


@Component({
  selector: 'app-order-form',
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
    MatIconModule,
     MatDatepickerModule,
  MatNativeDateModule
  ],
  templateUrl: './order-form.html',
  styleUrls: ['./order-form.scss']
})
export class OrderFormComponent implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<OrderFormComponent>);
  data = inject<{ orderId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  isSubmitting = false;
  showingAlert = false;
  customers: ICustomer[] = [];
  orderStatusEnum = OrderStatus;

  orderForm = this.fb.group({
    customerId: this.fb.control<number | null>(null, [Validators.required]),
    reference: this.fb.control<string>(''),
    weight: this.fb.control<number>(0, [Validators.required, Validators.min(0.1)]),
  weightUnit: this.fb.control<string>('palette', [Validators.required]),

    deliveryAddress: this.fb.control<string>(''),
    notes: this.fb.control<string>(''),
  
     deliveryDate: this.fb.control<Date | null>(null) 
  });

  ngOnInit() {
    this.loadCustomers();
    
    if (this.data.orderId) {
      this.loadOrder(this.data.orderId);
    }
  }

loadCustomers() {
 this.httpService.getCustomers().subscribe({
  next: (res) => {
    console.log('Customers loaded:', res); // doit afficher le tableau
    this.customers = res;
  },
  error: (err) => console.error(err)
});

}


loadOrder(id: number) {

 
  
  this.httpService.getOrderById(id).subscribe({
    next: (response: any) => {

      
      const order = response.data;
      // Patch ALL form values at once
this.orderForm.patchValue({
  customerId: order.customerId,
  reference: order.reference,
  weight: order.weight,
  deliveryAddress: order.deliveryAddress || '',
  notes: order.notes || '',
deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : null, // ✅ conversion string ->
 
});

      
      Object.keys(this.orderForm.controls).forEach(key => {
        const control = this.orderForm.get(key);
        console.log(`📋 ${key}:`, control?.value, 'valid:', control?.valid);
      });
    },
    error: (err) => {
      console.error('❌ Error:', err);
  
    }
  });
}

  onSubmit() {
    if (!this.orderForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;

    const formValue = this.orderForm.value;

    const selectedCustomer = this.customers.find(c => c.id === formValue.customerId);
    const orderData: CreateOrderDto = {
      customerId: formValue.customerId!,
      reference: formValue.reference || undefined,
      weight: formValue.weight!,
      weightUnit: formValue.weightUnit!,
      deliveryAddress: formValue.deliveryAddress || undefined,
      notes: formValue.notes || undefined,
     customerCity: selectedCustomer?.gouvernorat ,
       deliveryDate: formValue.deliveryDate ? formValue.deliveryDate.toISOString() : undefined 

    };

    if (this.data.orderId) {
      this.httpService.updateOrder(this.data.orderId, orderData).subscribe({
        next: () => {
          this.showSuccessAlert('Commande modifiée avec succès');
        },
        error: (err) => {
          this.handleError(err, 'modifier');
        }
      });
    } else {
      this.httpService.createOrder(orderData).subscribe({
        next: () => {
          this.showSuccessAlert('Commande ajoutée avec succès');
        },
        error: (err) => {
          this.handleError(err, 'ajouter');
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  getErrorMessage(controlName: string): string {
    const control = this.orderForm.get(controlName);
    
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} est obligatoire`;
    }
    
    if (control?.hasError('min')) {
      return `${this.getFieldLabel(controlName)} doit être supérieur à 0`;
    }
    
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} doit comporter au moins ${requiredLength} caractères`;
    }
    
    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      customerId: 'Le client',
      type: 'Le type',
      weight: 'Le poids'
    };
    return labels[controlName] || controlName;
  }

  private showSuccessAlert(message: string) {
    this.isSubmitting = false;
    this.showingAlert = true;
    
    Swal.fire({
      icon: 'success',
      title: message,
      confirmButtonText: 'OK',
      allowOutsideClick: false,
      customClass: {
        popup: 'swal2-popup-custom',
        title: 'swal2-title-custom',
        icon: 'swal2-icon-custom',
        confirmButton: 'swal2-confirm-custom'
      }
    }).then(() => this.dialogRef.close(true));
  }

  private handleError(err: any, action: string) {
    this.isSubmitting = false;
    
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: err?.message || `Impossible de ${action} la commande`,
      confirmButtonText: 'OK'
    });
  }
}