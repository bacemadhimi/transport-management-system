// trip-form.component.ts - UPDATED VERSION
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core'; // ADD ChangeDetectorRef
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule, FormArray, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // ADD THIS
import { Http } from '../../../services/http';
import { ITrip, TripStatusOptions } from '../../../types/trip';
import { ITruck } from '../../../types/truck';
import { IDriver } from '../../../types/driver';
import { ICustomer } from '../../../types/customer';
import { IOrder } from '../../../types/order';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-trip-form',
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
    MatTooltipModule,
    MatProgressSpinnerModule // ADD THIS
  ],
  templateUrl: './trip-form.html',
  styleUrls: ['./trip-form.scss']
})
export class TripFormComponent implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<TripFormComponent>);
  cdr = inject(ChangeDetectorRef); // ADD THIS
  data = inject<{ tripId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  trucks: ITruck[] = [];
  drivers: IDriver[] = [];
  customers: ICustomer[] = [];
  allOrders: IOrder[] = []; // Will be initialized as empty array
  ordersForQuickAdd: IOrder[] = [];
  customerOrdersMap: Map<number, IOrder[]> = new Map();
  
  // Add these properties for loading customer orders from API
  customerOrdersLoading: { [key: number]: boolean } = {};
  deliveryOrdersMap: { [key: number]: IOrder[] } = {};
  
  tripStatuses = TripStatusOptions;
  
  tripForm = this.fb.group({
    tripReference: this.fb.control<string>('', [Validators.required]),
    estimatedDistance: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
    estimatedDuration: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
    estimatedStartDate: this.fb.control<Date | null>(null, Validators.required),
    estimatedEndDate: this.fb.control<Date | null>(null, Validators.required),
    truckId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    driverId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    tripStatus: this.fb.control<string>('Planned', Validators.required),
    deliveries: this.fb.array<FormGroup>([])
  });

  get deliveries(): FormArray {
    return this.tripForm.get('deliveries') as FormArray;
  }

  ngOnInit() {
    // Initialize all arrays
    this.allOrders = [];
    this.ordersForQuickAdd = [];
    this.customers = [];
    this.trucks = [];
    this.drivers = [];
    
    this.loadCustomers();
    this.loadTrucks();
    this.loadDrivers();
    this.loadOrders();
    
    if (!this.data.tripId) {
      this.addDelivery();
    }
  }

  addDelivery() {
    const deliveryGroup = this.fb.group({
      customerId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
      orderId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
      deliveryAddress: this.fb.control<string>('', Validators.required),
      sequence: this.fb.control<number>(this.deliveries.length + 1, [Validators.required, Validators.min(1)]),
      plannedTime: this.fb.control<string | null>(null),
      notes: this.fb.control<string | null>(null)
    });
    
    this.deliveries.push(deliveryGroup);
    this.updateSequences();
  }

  quickAddOrder(order: IOrder) {
    const deliveryGroup = this.fb.group({
      customerId: this.fb.control<number>(order.customerId, [Validators.required, Validators.min(1)]),
      orderId: this.fb.control<number>(order.id, [Validators.required, Validators.min(1)]),
      deliveryAddress: this.fb.control<string>(this.getClientAddress(order.customerId) || '', Validators.required),
      sequence: this.fb.control<number>(this.deliveries.length + 1, [Validators.required, Validators.min(1)]),
      plannedTime: this.fb.control<string | null>(null),
      notes: this.fb.control<string | null>(null)
    });
    
    this.deliveries.push(deliveryGroup);
    this.updateSequences();
    
    // Remove from quick add list
    this.ordersForQuickAdd = this.ordersForQuickAdd.filter(o => o.id !== order.id);
  }

  selectOrder(deliveryIndex: number, order: IOrder) {
    const deliveryGroup = this.deliveries.at(deliveryIndex);
    deliveryGroup.get('orderId')?.setValue(order.id);
    
    // Auto-fill address if empty
    if (!deliveryGroup.get('deliveryAddress')?.value) {
      const customer = this.customers.find(c => c.id === deliveryGroup.get('customerId')?.value);
      if (customer?.adress) {
        deliveryGroup.get('deliveryAddress')?.setValue(customer.adress);
      }
    }
  }

  removeDelivery(index: number) {
    const deliveryGroup = this.deliveries.at(index);
    const orderId = deliveryGroup.get('orderId')?.value;
    
    // Add back to quick add if it was a pending order
    if (orderId && this.allOrders && Array.isArray(this.allOrders)) {
      const order = this.allOrders.find(o => o.id === orderId);
      if (order && order.status === 'Pending' && !this.ordersForQuickAdd.some(o => o.id === order.id)) {
        this.ordersForQuickAdd.push(order);
      }
    }
    
    // Clear delivery-specific orders
    delete this.deliveryOrdersMap[index];
    
    this.deliveries.removeAt(index);
    this.updateSequences();
    
    // Re-index deliveryOrdersMap
    const newDeliveryOrdersMap: { [key: number]: IOrder[] } = {};
    Object.keys(this.deliveryOrdersMap).forEach(key => {
      const oldIndex = parseInt(key);
      if (oldIndex > index) {
        newDeliveryOrdersMap[oldIndex - 1] = this.deliveryOrdersMap[oldIndex];
      } else if (oldIndex < index) {
        newDeliveryOrdersMap[oldIndex] = this.deliveryOrdersMap[oldIndex];
      }
    });
    this.deliveryOrdersMap = newDeliveryOrdersMap;
  }

  updateSequences() {
    this.deliveries.controls.forEach((control, index) => {
      control.get('sequence')?.setValue(index + 1, { emitEvent: false });
    });
  }

  onCustomerChange(deliveryIndex: number) {
    const deliveryGroup = this.deliveries.at(deliveryIndex);
    const customerId = deliveryGroup.get('customerId')?.value;
    
    if (customerId) {
      // Reset selected order
      deliveryGroup.get('orderId')?.setValue(0);
      
      // Load customer's default address if available
      const customer = this.customers.find(c => c.id === customerId);
      if (customer && customer.adress) {
        deliveryGroup.get('deliveryAddress')?.setValue(customer.adress);
      }
      
      // Clear previous orders for this delivery
      this.deliveryOrdersMap[deliveryIndex] = [];
      
      // Load orders from API
      this.loadCustomerOrders(deliveryIndex, customerId);
    }
  }

  // FIXED: Get customer orders from API response
  getCustomerOrders(deliveryIndex: number): IOrder[] {
    // Get orders loaded from API for this specific delivery
    const apiOrders = this.deliveryOrdersMap[deliveryIndex] || [];
    
    // Filter out orders already selected in other deliveries
    const selectedOrderIds = this.deliveries.controls
      .map((ctrl, index) => {
        if (index === deliveryIndex) return null;
        return ctrl.get('orderId')?.value;
      })
      .filter(id => id && id > 0);
    
    return apiOrders.filter(order => !selectedOrderIds.includes(order.id));
  }

  // Load orders from API when customer is selected
  loadCustomerOrders(deliveryIndex: number, customerId: number) {
    this.customerOrdersLoading[deliveryIndex] = true;
    
    this.httpService.getOrdersByCustomerId(customerId).subscribe({
      next: (orders) => {
        // Store orders for this delivery
        this.deliveryOrdersMap[deliveryIndex] = Array.isArray(orders) ? orders : [];
        this.customerOrdersLoading[deliveryIndex] = false;
        
        // Auto-select if only one order
        if (this.deliveryOrdersMap[deliveryIndex].length === 1) {
          this.selectOrder(deliveryIndex, this.deliveryOrdersMap[deliveryIndex][0]);
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading customer orders:', error);
        this.deliveryOrdersMap[deliveryIndex] = [];
        this.customerOrdersLoading[deliveryIndex] = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Check if orders are loading for a delivery
  isCustomerOrdersLoading(deliveryIndex: number): boolean {
    return this.customerOrdersLoading[deliveryIndex] === true;
  }

  getClientName(customerId: number): string {
    if (!customerId || !Array.isArray(this.customers)) return 'Non spécifié';
    const customer = this.customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Non spécifié';
  }

  getClientAddress(customerId: number): string {
    if (!customerId || !Array.isArray(this.customers)) return '';
    const customer = this.customers.find(c => c.id === customerId);
    return customer ? (customer.adress || '') : '';
  }

  // SAFE VERSION: Get order reference with proper checks
  getOrderReference(orderId: number): string {
    try {
      if (!orderId) return 'N/A';
      
      // First check delivery-specific orders
      for (const key in this.deliveryOrdersMap) {
        const orders = this.deliveryOrdersMap[key];
        if (Array.isArray(orders)) {
          const order = orders.find(o => o && o.id === orderId);
          if (order) return order.reference || 'N/A';
        }
      }
      
      // Then check allOrders with proper check
      if (this.allOrders && Array.isArray(this.allOrders)) {
        const order = this.allOrders.find(o => o && o.id === orderId);
        return order ? (order.reference || 'N/A') : 'N/A';
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Error in getOrderReference:', error);
      return 'N/A';
    }
  }

  getOrderType(orderId: number): string {
    try {
      if (!orderId) return 'Non spécifié';
      
      // First check delivery-specific orders
      for (const key in this.deliveryOrdersMap) {
        const orders = this.deliveryOrdersMap[key];
        if (Array.isArray(orders)) {
          const order = orders.find(o => o && o.id === orderId);
          if (order) return order.type || 'Non spécifié';
        }
      }
      
      // Then check allOrders with proper check
      if (this.allOrders && Array.isArray(this.allOrders)) {
        const order = this.allOrders.find(o => o && o.id === orderId);
        return order ? (order.type || 'Non spécifié') : 'Non spécifié';
      }
      
      return 'Non spécifié';
    } catch (error) {
      console.error('Error in getOrderType:', error);
      return 'Non spécifié';
    }
  }

  getOrderWeight(orderId: number): string {
    try {
      if (!orderId) return '0';
      
      // First check delivery-specific orders
      for (const key in this.deliveryOrdersMap) {
        const orders = this.deliveryOrdersMap[key];
        if (Array.isArray(orders)) {
          const order = orders.find(o => o && o.id === orderId);
          if (order) return order.weight?.toString() || '0';
        }
      }
      
      // Then check allOrders with proper check
      if (this.allOrders && Array.isArray(this.allOrders)) {
        const order = this.allOrders.find(o => o && o.id === orderId);
        return order ? (order.weight?.toString() || '0') : '0';
      }
      
      return '0';
    } catch (error) {
      console.error('Error in getOrderWeight:', error);
      return '0';
    }
  }

  getSelectedTruckInfo(): string {
    const truckId = this.tripForm.get('truckId')?.value;
    const truck = this.trucks.find(t => t.id === truckId);
    return truck ? `${truck.immatriculation} - ${truck.brand}` : 'Non sélectionné';
  }

  getSelectedDriverInfo(): string {
    const driverId = this.tripForm.get('driverId')?.value;
    const driver = this.drivers.find(d => d.id === driverId);
    return driver ? `${driver.name} (${driver.permisNumber})` : 'Non sélectionné';
  }

  private loadCustomers() {
    this.httpService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = Array.isArray(customers) ? customers : [];
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error?.message || 'Erreur lors du chargement des clients',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  private loadTrucks() {
    this.httpService.getTrucks().subscribe({
      next: (trucks) => {
        this.trucks = Array.isArray(trucks) ? trucks.filter(truck => truck.status === 'Disponible') : [];
      },
      error: (error) => {
        console.error('Error loading trucks:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Erreur lors du chargement des camions',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  private loadDrivers() {
    this.httpService.getDrivers().subscribe({
      next: (drivers) => {
        this.drivers = Array.isArray(drivers) ? drivers.filter(driver => driver.status === 'Disponible') : [];
      },
      error: (error) => {
        console.error('Error loading drivers:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Erreur lors du chargement des chauffeurs',
          confirmButtonText: 'OK'
        });
      }
    });
  }

 private loadOrders() {
  console.log('Loading all orders...');
  
  this.httpService.getOrders().subscribe({
    next: (orders: IOrder[]) => {
      console.log('Orders loaded successfully:', orders);
      
      // Always ensure orders is an array
      this.allOrders = Array.isArray(orders) ? orders : [];
      
      console.log('Total orders loaded:', this.allOrders.length);
      
      if (this.allOrders.length > 0) {
        console.log('First order sample:', this.allOrders[0]);
      }
      
      // Filter orders for quick add (pending and not yet assigned)
      this.ordersForQuickAdd = this.allOrders.filter(order => 
        order && order.status === 'Pending'
      );
      
      console.log('Quick add orders:', this.ordersForQuickAdd.length);
      
      // Create a map of orders by customer
      this.customerOrdersMap.clear();
      this.allOrders.forEach(order => {
        if (order && order.customerId) {
          if (!this.customerOrdersMap.has(order.customerId)) {
            this.customerOrdersMap.set(order.customerId, []);
          }
          this.customerOrdersMap.get(order.customerId)?.push(order);
        }
      });
      
      // Trigger change detection
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error loading orders:', error);
      // Initialize as empty array on error
      this.allOrders = [];
      this.ordersForQuickAdd = [];
      this.cdr.detectChanges();
    }
  });
}
  private loadTrip() {
    this.httpService.getTrip(this.data.tripId!).subscribe({
      next: (trip: ITrip) => {
        // Convert dates
        const estimatedStartDate = trip.estimatedStartDate ? new Date(trip.estimatedStartDate) : null;
        const estimatedEndDate = trip.estimatedEndDate ? new Date(trip.estimatedEndDate) : null;
        
        this.tripForm.patchValue({
          tripReference: trip.tripReference,
          estimatedDistance: trip.estimatedDistance,
          estimatedDuration: trip.estimatedDuration,
          estimatedStartDate: estimatedStartDate,
          estimatedEndDate: estimatedEndDate,
          truckId: trip.truckId,
          driverId: trip.driverId,
          tripStatus: trip.tripStatus
        });
        
        // Clear existing deliveries
        while (this.deliveries.length > 0) {
          this.deliveries.removeAt(0);
        }
        
        // Add trip deliveries
        if (trip.deliveries && trip.deliveries.length > 0) {
          trip.deliveries.forEach((delivery, index) => {
            const deliveryGroup = this.fb.group({
              customerId: this.fb.control<number>(delivery.customerId, [Validators.required, Validators.min(1)]),
              orderId: this.fb.control<number>(delivery.orderId, [Validators.required, Validators.min(1)]),
              deliveryAddress: this.fb.control<string>(delivery.deliveryAddress, Validators.required),
              sequence: this.fb.control<number>(delivery.sequence, [Validators.required, Validators.min(1)]),
              plannedTime: this.fb.control<string | null>(delivery.plannedTime?.toString() || null),
              notes: this.fb.control<string | null>(delivery.notes || null)
            });
            
            this.deliveries.push(deliveryGroup);
            
            // Load orders for this customer when editing
            this.loadCustomerOrders(index, delivery.customerId);
          });
        } else {
          this.addDelivery();
        }
      },
      error: (error) => {
        console.error('Error loading trip:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error?.message || 'Erreur lors du chargement du voyage',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  onSubmit() {
    if (!this.tripForm.valid || this.deliveries.length === 0) {
      this.markAllAsTouched();
      return;
    }

    const formValue = this.tripForm.value;
    
    // Format dates
    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Prepare deliveries
    const deliveriesData = (formValue.deliveries || []).map((delivery: any) => ({
      customerId: delivery.customerId,
      orderId: delivery.orderId,
      deliveryAddress: delivery.deliveryAddress,
      sequence: delivery.sequence,
      plannedTime: delivery.plannedTime || null,
      notes: delivery.notes || null
    }));

    // Create trip object
    const tripData: any = {
      tripReference: formValue.tripReference!,
      estimatedDistance: formValue.estimatedDistance!,
      estimatedDuration: formValue.estimatedDuration!,
      estimatedStartDate: formatDate(formValue.estimatedStartDate!),
      estimatedEndDate: formatDate(formValue.estimatedEndDate!),
      truckId: formValue.truckId!,
      driverId: formValue.driverId!,
      tripStatus: formValue.tripStatus!,
      deliveries: deliveriesData
    };

    // Add ID if editing
    if (this.data.tripId) {
      tripData.id = this.data.tripId;
    }

    if (this.data.tripId) {
      // Update
      this.httpService.updateTrip(this.data.tripId, tripData).subscribe({
        next: () => {
          this.showSuccess('Voyage modifié avec succès');
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.showError('Erreur lors de la modification du voyage', error);
        }
      });
    } else {
      // Create
      this.httpService.createTrip(tripData).subscribe({
        next: () => {
          this.showSuccess('Voyage créé avec succès');
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.showError('Erreur lors de la création du voyage', error);
        }
      });
    }
  }

  private markAllAsTouched() {
    Object.keys(this.tripForm.controls).forEach(key => {
      const control = this.tripForm.get(key);
      control?.markAsTouched();
    });

    const deliveriesArray = this.tripForm.get('deliveries') as FormArray;
    deliveriesArray.controls.forEach(control => {
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(key => {
          control.get(key)?.markAsTouched();
        });
      }
    });
  }

  private showSuccess(message: string) {
    Swal.fire({
      icon: 'success',
      title: message,
      confirmButtonText: 'OK',
      allowOutsideClick: false
    });
  }

  private showError(title: string, error: any) {
    console.error('Error:', error);
    Swal.fire({
      icon: 'error',
      title: title,
      text: error?.message || 'Une erreur est survenue',
      confirmButtonText: 'OK'
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  get deliveryControls(): FormGroup[] {
    return this.deliveries.controls as FormGroup[];
  }

  getOrdersByCustomerId(customerId: number): IOrder[] {
    if (!customerId || !this.allOrders || !Array.isArray(this.allOrders)) return [];
    
    return this.allOrders.filter(order => 
      order && order.customerId === customerId && 
      order.status === 'Pending'
    );
  }
}