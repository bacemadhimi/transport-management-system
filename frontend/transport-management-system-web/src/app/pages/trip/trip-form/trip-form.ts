// trip-form.component.ts
import { Component, inject, OnInit } from '@angular/core';
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
    MatTooltipModule
  ],
  templateUrl: './trip-form.html',
  styleUrls: ['./trip-form.scss']
})
export class TripFormComponent implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<TripFormComponent>);
  data = inject<{ tripId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  trucks: ITruck[] = [];
  drivers: IDriver[] = [];
  customers: ICustomer[] = [];
  allOrders: IOrder[] = [];
  ordersForQuickAdd: IOrder[] = [];
  customerOrdersMap: Map<number, IOrder[]> = new Map();
  
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
    if (orderId) {
      const order = this.allOrders.find(o => o.id === orderId);
      if (order && order.status === 'Pending' && !this.ordersForQuickAdd.some(o => o.id === order.id)) {
        this.ordersForQuickAdd.push(order);
      }
    }
    
    this.deliveries.removeAt(index);
    this.updateSequences();
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
      // Réinitialiser la commande sélectionnée
      deliveryGroup.get('orderId')?.setValue(0);
      
      // Charger l'adresse par défaut du client si disponible
      const customer = this.customers.find(c => c.id === customerId);
      if (customer && customer.adress) {
        deliveryGroup.get('deliveryAddress')?.setValue(customer.adress);
      }
    }
  }

  getCustomerOrders(deliveryIndex: number): IOrder[] {
    const deliveryGroup = this.deliveries.at(deliveryIndex);
    const customerId = deliveryGroup.get('customerId')?.value;
    
    if (!customerId) return [];
    
    // Get orders for this customer that aren't already selected in other deliveries
    const selectedOrderIds = this.deliveries.controls
      .map(ctrl => ctrl.get('orderId')?.value)
      .filter(id => id && id > 0);
    
    return this.allOrders.filter(order => 
      order.customerId === customerId && 
      order.status === 'Pending' &&
      !selectedOrderIds.includes(order.id)
    );
  }

  getClientName(customerId: number): string {
    const customer = this.customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Non spécifié';
  }

  getClientAddress(customerId: number): string {
    const customer = this.customers.find(c => c.id === customerId);
    return customer ? (customer.adress || '') : '';
  }

  getOrderReference(orderId: number): string {
    const order = this.allOrders.find(o => o.id === orderId);
    return order ? order.reference : 'N/A';
  }

  //getOrderType(orderId: number): string {
    //const order = this.allOrders.find(o => o.id === orderId);
    //return order ? (order.type || 'Non spécifié') : 'N/A';
  //}

  getOrderWeight(orderId: number): string {
    const order = this.allOrders.find(o => o.id === orderId);
    return order ? order.weight.toString() : '0';
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
        this.customers = customers;
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
        // Filtrer seulement les camions disponibles
        this.trucks = trucks.filter(truck => truck.status === 'Disponible');
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
        // Filtrer seulement les chauffeurs disponibles
        this.drivers = drivers.filter(driver => driver.status === 'Disponible');
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
    this.httpService.getOrders().subscribe({
      next: (orders) => {
        this.allOrders = orders;
        
        // Filter orders for quick add (pending and not yet assigned)
        this.ordersForQuickAdd = orders.filter(order => 
          order.status === 'Pending'
        );
        
        // Créer une map des commandes par client
        this.customerOrdersMap.clear();
        orders.forEach(order => {
          if (!this.customerOrdersMap.has(order.customerId)) {
            this.customerOrdersMap.set(order.customerId, []);
          }
          this.customerOrdersMap.get(order.customerId)?.push(order);
        });
      },
      error: (error) => {
        console.error('Error loading orders:', error);
      }
    });
  }

  private loadTrip() {
    this.httpService.getTrip(this.data.tripId!).subscribe({
      next: (trip: ITrip) => {
        // Convertir les dates
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
        
        // Vider les livraisons existantes
        while (this.deliveries.length > 0) {
          this.deliveries.removeAt(0);
        }
        
        // Ajouter les livraisons du trajet
        if (trip.deliveries && trip.deliveries.length > 0) {
          trip.deliveries.forEach(delivery => {
            const deliveryGroup = this.fb.group({
              customerId: this.fb.control<number>(delivery.customerId, [Validators.required, Validators.min(1)]),
              orderId: this.fb.control<number>(delivery.orderId, [Validators.required, Validators.min(1)]),
              deliveryAddress: this.fb.control<string>(delivery.deliveryAddress, Validators.required),
              sequence: this.fb.control<number>(delivery.sequence, [Validators.required, Validators.min(1)]),
              plannedTime: this.fb.control<string | null>(delivery.plannedTime?.toString() || null),
              notes: this.fb.control<string | null>(delivery.notes || null)
            });
            
            this.deliveries.push(deliveryGroup);
            
            // Remove from quick add
            this.ordersForQuickAdd = this.ordersForQuickAdd.filter(o => o.id !== delivery.orderId);
          });
        } else {
          // Ajouter une livraison par défaut si aucune n'existe
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
    
    // Formater les dates
    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Préparer les livraisons
    const deliveriesData = (formValue.deliveries || []).map((delivery: any) => ({
      customerId: delivery.customerId,
      orderId: delivery.orderId,
      deliveryAddress: delivery.deliveryAddress,
      sequence: delivery.sequence,
      plannedTime: delivery.plannedTime || null,
      notes: delivery.notes || null
    }));

    // Créer l'objet trip
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

    // Ajouter l'ID si modification
    if (this.data.tripId) {
      tripData.id = this.data.tripId;
    }

    if (this.data.tripId) {
      // Mise à jour
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
      // Création
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
}