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
    MatIconModule
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
    type: this.fb.control<string>('', [Validators.required]),
    weight: this.fb.control<number>(0, [Validators.required, Validators.min(0.1)]),
    deliveryAddress: this.fb.control<string>(''),
    notes: this.fb.control<string>(''),
    priority: this.fb.control<number>(5, [Validators.required, Validators.min(1), Validators.max(10)]),
    status: this.fb.control<OrderStatus>(OrderStatus.Pending, [Validators.required])
  });

  ngOnInit() {
    this.loadCustomers();
    
    if (this.data.orderId) {
      this.loadOrder(this.data.orderId);
    }
  }

  loadCustomers() {
    this.httpService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers;
      },
      error: (err) => {
        console.error('Error loading customers:', err);
      }
    });
  }

loadOrder(id: number) {
  console.log('🔄 Loading order ID:', id);
 
  
  this.httpService.getOrderById(id).subscribe({
    next: (response: any) => {
      console.log('✅ Order data received:', response.data);    
      const order = response.data;
       
      this.orderForm.patchValue({
        customerId: order.customerId,
        reference: order.reference,
        type: order.type,
        weight: order.weight,
        deliveryAddress: order.deliveryAddress || '',
        notes: order.notes || '',
        priority: order.priority,
        status: order.status === 'Pending' ? OrderStatus.Pending : 
                order.status === 'InProgress' ? OrderStatus.InProgress :
                order.status === 'Delivered' ? OrderStatus.Delivered :
                order.status === 'Cancelled' ? OrderStatus.Cancelled : OrderStatus.Pending
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
    const orderData: CreateOrderDto = {
      customerId: formValue.customerId!,
      reference: formValue.reference || undefined,
      type: formValue.type!,
      weight: formValue.weight!,
      deliveryAddress: formValue.deliveryAddress || undefined,
      notes: formValue.notes || undefined,
      priority: formValue.priority!,
      status: formValue.status!,
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
      weight: 'Le poids',
      priority: 'La priorité'
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