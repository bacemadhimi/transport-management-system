import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CreateDeliveryDto, CreateTripDto, DeliveryStatusOptions, TripStatus, TripStatusOptions, UpdateTripDto } from '../../../types/trip';
import { ITruck } from '../../../types/truck';
import { IDriver } from '../../../types/driver';
import { ICustomer } from '../../../types/customer';
import { IOrder } from '../../../types/order';
import { Http } from '../../../services/http';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime } from 'rxjs';


interface DialogData {
  tripId?: number;
}

@Component({
  selector: 'app-trip-form',
  standalone: true,
  templateUrl: './trip-form.html',
  styleUrls: ['./trip-form.scss'],
  imports: [ CommonModule,
    ReactiveFormsModule,
    
    // Angular Material Modules
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
    ], providers: [DatePipe]
})
export class TripForm implements OnInit {
  tripForm!: FormGroup;
  deliveries: FormArray;
  
  // Data lists
  trucks: ITruck[] = [];
  drivers: IDriver[] = [];
  customers: ICustomer[] = [];
  allOrders: IOrder[] = [];
  ordersForQuickAdd: IOrder[] = [];
  searchControl = new FormControl('');
  filteredOrders: IOrder[] = [];
  
  // Status options
  tripStatuses = TripStatusOptions;
  deliveryStatuses = DeliveryStatusOptions;
  public Math = Math; 
  
  // Loading states
  loading = false;
  loadingTrucks = false;
  loadingDrivers = false;
  loadingCustomers = false;
  loadingOrders = false;
  displayMode: 'grid' | 'list' = 'grid';
  constructor(
    private fb: FormBuilder,
    private http: Http,
    private dialogRef: MatDialogRef<TripForm>,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe ,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.deliveries = this.fb.array([]);
  }

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    
    if (this.data.tripId) {
      this.loadTrip(this.data.tripId);
    }
     this.searchControl.valueChanges
    .pipe(debounceTime(300))
    .subscribe(() => {
      this.applySearchFilter();
    });
  }

  private initForm(): void {
    this.tripForm = this.fb.group({
      estimatedStartDate: [null, Validators.required],
      estimatedEndDate: [null, Validators.required],
      truckId: ['', Validators.required],
      driverId: ['', Validators.required],
      estimatedDistance: ['', [Validators.required, Validators.min(0.1)]],
      estimatedDuration: ['', [Validators.required, Validators.min(0.1)]],
      tripStatus: [TripStatus.Planned, Validators.required],
      deliveries: this.deliveries
    });

    // Add first delivery by default
    this.addDelivery();
  }

  private loadData(): void {
    this.loadTrucks();
    this.loadDrivers();
    this.loadCustomers();
    this.loadAvailableOrders();
  }

  private loadTrucks(): void {
    this.loadingTrucks = true;
    this.http.getTrucks().subscribe({
      next: (trucks) => {
        this.trucks = trucks;
        this.loadingTrucks = false;
      },
      error: (error) => {
        console.error('Error loading trucks:', error);
        this.snackBar.open('Erreur lors du chargement des camions', 'Fermer', { duration: 3000 });
        this.loadingTrucks = false;
      }
    });
  }

  private loadDrivers(): void {
    this.loadingDrivers = true;
    this.http.getDrivers().subscribe({
      next: (drivers) => {
        this.drivers = drivers;
        this.loadingDrivers = false;
      },
      error: (error) => {
        console.error('Error loading drivers:', error);
        this.snackBar.open('Erreur lors du chargement des chauffeurs', 'Fermer', { duration: 3000 });
        this.loadingDrivers = false;
      }
    });
  }

  private loadCustomers(): void {
    this.loadingCustomers = true;
    this.http.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers;
        this.loadingCustomers = false;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.snackBar.open('Erreur lors du chargement des clients', 'Fermer', { duration: 3000 });
        this.loadingCustomers = false;
      }
    });
  }

private loadAvailableOrders(): void {
  this.loadingOrders = true;
  this.http.getOrders().subscribe({
    next: (response: any) => {
      const orders = response.data ?? response.orders ?? response;
      this.allOrders = Array.isArray(orders) ? orders : [];
      
      this.ordersForQuickAdd = this.allOrders.filter(order =>
        order.status === 'Pending' || order.status === 'En attente'
      );
      
      // Initialiser filteredOrders
      this.filteredOrders = [...this.ordersForQuickAdd];
      this.loadingOrders = false;
    }
  });
}

private loadTrip(tripId: number): void {
  this.loading = true;
  this.http.getTrip(tripId).subscribe({
    next: (response: any) => {
      console.log('Full response:', response);
      
      // Extract trip data from the response
      const trip = response.data || response;
      console.log('Trip data:', trip);
      
      if (!trip) {
        console.error('No trip data found in response');
        this.snackBar.open('Aucune donnée de voyage trouvée', 'Fermer', { duration: 3000 });
        this.loading = false;
        return;
      }

      // Handle date conversion properly
        const toLocalDate = (iso: string | null): Date | null => {
          if (!iso || iso.startsWith('0001-01-01')) return null;

          const d = new Date(iso);

          // rebuild LOCAL date (this is the key)
          return new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate()
          );
        };

        const startDate = toLocalDate(trip.estimatedStartDate);
        const endDate = toLocalDate(trip.estimatedEndDate);

      
      // DEBUG: Check the structure
      console.log('Truck object:', trip.truck);
      console.log('Driver object:', trip.driver);
      console.log('TruckId from trip:', trip.truckId);
      console.log('DriverId from trip:', trip.driverId);
      
      // Get IDs from nested objects if direct IDs are 0
     const truckId =
  trip.truckId && trip.truckId !== 0
    ? trip.truckId
    : trip.truck?.id ?? null;

const driverId =
  trip.driverId && trip.driverId !== 0
    ? trip.driverId
    : trip.driver?.id ?? null;

      
      console.log('Final truckId for form:', truckId, 'Type:', typeof truckId);
      console.log('Final driverId for form:', driverId, 'Type:', typeof driverId);
      
      // Patch form values
      this.tripForm.patchValue({
        tripReference: trip.tripReference || trip.bookingId || '',
        estimatedStartDate: startDate,
        estimatedEndDate: endDate,
        truckId: truckId,
        driverId: driverId,
        estimatedDistance: trip.estimatedDistance || 0,
        estimatedDuration: trip.estimatedDuration || 0,
        tripStatus: trip.tripStatus || TripStatus.Planned
      });

      console.log('Form values after patch:', this.tripForm.value);
      
      // Force the dropdowns to update after a delay
      setTimeout(() => {
        console.log('Available trucks IDs:', this.trucks.map(t => ({id: t.id, type: typeof t.id})));
        console.log('Available drivers IDs:', this.drivers.map(d => ({id: d.id, type: typeof d.id})));
        
        // Re-apply values to trigger change detection
        if (truckId) {
          this.tripForm.get('truckId')?.setValue(truckId);
        }
        if (driverId) {
          this.tripForm.get('driverId')?.setValue(driverId);
        }
      }, 100);
      
      // Clear existing deliveries and add loaded ones
      this.deliveries.clear();
      
      // Check for deliveries in the trip data
      const deliveries = trip.deliveries || [];
      
      // DEBUG: Log PlannedTime from API
      console.log('=== DEBUG: Delivery PlannedTimes from API ===');
      deliveries.forEach((delivery: any, index: number) => {
        console.log(`Delivery ${index}:`, {
          plannedTime: delivery.plannedTime,
          type: typeof delivery.plannedTime,
          isString: typeof delivery.plannedTime === 'string',
          contains0001: delivery.plannedTime?.includes?.('0001-01-01'),
          length: delivery.plannedTime?.length
        });
      });
      console.log('============================================');
      
      if (deliveries.length > 0) {
        const sortedDeliveries = [...deliveries].sort((a, b) => 
          (a.sequence || 0) - (b.sequence || 0)
        );
        
        sortedDeliveries.forEach(delivery => {
          this.addDelivery(delivery);
        });
        
        // DEBUG: Check what was actually added to the form
        setTimeout(() => {
          console.log('=== DEBUG: Delivery PlannedTimes in Form ===');
          this.deliveryControls.forEach((group, index) => {
            console.log(`Delivery ${index} in form:`, {
              plannedTime: group.get('plannedTime')?.value,
              customerId: group.get('customerId')?.value,
              orderId: group.get('orderId')?.value
            });
          });
          console.log('==========================================');
        }, 200);
      } else {
        this.addDelivery();
      }
      
      this.loading = false;
    },
    error: (error) => {
      console.error('Error loading trip:', error);
      this.snackBar.open('Erreur lors du chargement du voyage', 'Fermer', { duration: 3000 });
      this.loading = false;
    }
  });
}
  // Delivery management
  get deliveryControls(): FormGroup[] {
    return this.deliveries.controls as FormGroup[];
  }

  addDelivery(deliveryData?: any): void {
    const sequence = this.deliveries.length + 1;
    const plannedTime =
    deliveryData?.plannedTime
      ? new Date(deliveryData.plannedTime).toISOString().substring(11, 16)
      : '';
    const deliveryGroup = this.fb.group({
      customerId: [deliveryData?.customerId || '', Validators.required],
      orderId: [deliveryData?.orderId || '', Validators.required],
      deliveryAddress: [deliveryData?.deliveryAddress || '', [Validators.required, Validators.maxLength(500)]],
      sequence: [deliveryData?.sequence || sequence, [Validators.required, Validators.min(1)]],
      plannedTime: [plannedTime],
      notes: [deliveryData?.notes || '']
    });

    this.deliveries.push(deliveryGroup);
  }

  removeDelivery(index: number): void {
    this.deliveries.removeAt(index);
    // Update sequences
    this.updateDeliverySequences();
  }

  updateDeliverySequences(): void {
    this.deliveryControls.forEach((group, index) => {
      group.get('sequence')?.setValue(index + 1, { emitEvent: false });
    });
  }

  onCustomerChange(index: number): void {
    const deliveryGroup = this.deliveryControls[index];
    const customerId = deliveryGroup.get('customerId')?.value;
    
    if (customerId) {
      // Reset order selection
      deliveryGroup.get('orderId')?.setValue('');
      
      // Pre-fill address if customer exists
      const customer = this.customers.find(c => c.id === customerId);
      if (customer && customer.adress) {
        deliveryGroup.get('deliveryAddress')?.setValue(customer.adress);
      }
    }
  }

  getCustomerOrders(index: number): IOrder[] {
    const deliveryGroup = this.deliveryControls[index];
    const customerId = deliveryGroup.get('customerId')?.value;
    
    if (!customerId) return [];
    
    // Filter orders for this customer
    return this.allOrders.filter(order => 
      order.customerId === customerId && 
      (order.status === 'Pending' || order.status === 'En attente')
    );
  }

  // Helper methods for display
  getClientName(customerId: number): string {
    if (!customerId) return 'Non spécifié';
    const customer = this.customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Client inconnu';
  }

  getClientAddress(customerId: number): string {
    if (!customerId) return '';
    const customer = this.customers.find(c => c.id === customerId);
    return customer ? (customer.adress || 'Adresse non disponible') : '';
  }

  getOrderReference(orderId: number): string {
    if (!orderId) return 'N/A';
    const order = this.allOrders.find(o => o.id === orderId);
    return order ? order.reference : 'Commande inconnue';
  }

  getOrderType(orderId: number): string {
    if (!orderId) return 'N/A';
    const order = this.allOrders.find(o => o.id === orderId);
    return order ? (order.type || 'Non spécifié') : 'N/A';
  }

  getOrderWeight(orderId: number): number {
    if (!orderId) return 0;
    const order = this.allOrders.find(o => o.id === orderId);
    return order ? order.weight : 0;
  }

  getSelectedTruckInfo(): string {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return 'Non sélectionné';
    
    const truck = this.trucks.find(t => t.id === truckId);
    return truck ? `${truck.immatriculation} - ${truck.brand}` : 'Camion inconnu';
  }

  // Quick add functionality
 quickAddOrder(order: IOrder): void {
  const customer = this.customers.find(c => c.id === order.customerId);
  
  const newDelivery = {
    customerId: order.customerId,
    orderId: order.id,
    deliveryAddress: customer?.adress || '',
    sequence: this.deliveries.length + 1,
    notes: `Commande rapide: ${order.reference}`
  };
  
  this.addDelivery(newDelivery);
  
  // Retirer des deux listes
  this.ordersForQuickAdd = this.ordersForQuickAdd.filter(o => o.id !== order.id);
  this.filteredOrders = this.filteredOrders.filter(o => o.id !== order.id);
  
  this.snackBar.open('Commande ajoutée au trajet', 'Fermer', { duration: 2000 });
}

  // Form submission
onSubmit(): void {
  if (this.tripForm.invalid || this.deliveries.length === 0) {
    this.markFormGroupTouched(this.tripForm);
    this.deliveryControls.forEach(group => this.markFormGroupTouched(group));
    
    if (this.deliveries.length === 0) {
      this.snackBar.open('Ajoutez au moins une livraison', 'Fermer', { duration: 3000 });
    }
    return;
  }

  const formValue = this.tripForm.value;
  
  // Prepare the deliveries
  const deliveries = this.prepareDeliveries(formValue.estimatedStartDate);
  
  // For update, use UpdateTripDto (includes tripStatus)
  if (this.data.tripId) {
    const updateTripData: UpdateTripDto = {
      estimatedDistance: parseFloat(formValue.estimatedDistance) || 0,
      estimatedDuration: parseFloat(formValue.estimatedDuration) || 0,
      estimatedStartDate: this.formatDateWithTime(formValue.estimatedStartDate, '08:00:00'),
      estimatedEndDate: this.formatDateWithTime(formValue.estimatedEndDate, '18:00:00'),
      truckId: parseInt(formValue.truckId),
      driverId: parseInt(formValue.driverId),
      tripStatus: formValue.tripStatus,
      deliveries: deliveries
    };

    console.log('Updating trip with data:', JSON.stringify(updateTripData, null, 2));
    
    this.http.updateTrip(this.data.tripId, updateTripData).subscribe({
      next: () => {
        this.snackBar.open('Voyage modifié avec succès', 'Fermer', { duration: 3000 });
        this.dialogRef.close(true);
        this.loading = false;
      },
      error: (error) => {
        console.error('Update error:', error);
        this.snackBar.open('Erreur lors de la modification du voyage', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  } 
  // For create, use CreateTripDto (doesn't include tripStatus in your backend)
  else {
    const createTripData: CreateTripDto = {
      estimatedDistance: parseFloat(formValue.estimatedDistance) || 0,
      estimatedDuration: parseFloat(formValue.estimatedDuration) || 0,
      estimatedStartDate: this.formatDateWithTime(formValue.estimatedStartDate, '08:00:00'),
      estimatedEndDate: this.formatDateWithTime(formValue.estimatedEndDate, '18:00:00'),
      truckId: parseInt(formValue.truckId),
      driverId: parseInt(formValue.driverId),
      deliveries: deliveries
    };

    console.log('Creating trip with data:', JSON.stringify(createTripData, null, 2));
    
    this.http.createTrip(createTripData).subscribe({
      next: () => {
        this.snackBar.open('Voyage créé avec succès', 'Fermer', { duration: 3000 });
        this.dialogRef.close(true);
        this.loading = false;
      },
      error: (error) => {
        console.error('Create error:', error);
        console.error('Error details:', error.error);
        this.snackBar.open('Erreur lors de la création du voyage', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }
}

private prepareDeliveries(baseDate: any): CreateDeliveryDto[] {
  return this.deliveryControls.map((group, index) => {
    const delivery = group.value;
    const plannedTime = delivery.plannedTime ? 
      this.formatTimeToDateTime(baseDate, delivery.plannedTime) : 
      null;
    
    return {
      customerId: parseInt(delivery.customerId),
      orderId: parseInt(delivery.orderId),
      deliveryAddress: delivery.deliveryAddress,
      sequence: parseInt(delivery.sequence) || (index + 1),
      plannedTime: plannedTime,
      notes: delivery.notes || null
    };
  });
}

private formatDateWithTime(date: any, defaultTime: string): string {
  if (!date) return '';
  
  let dateObj: Date;
  
  if (date instanceof Date) {
    dateObj = new Date(date);
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    return '';
  }
  
  // Vérifier si la date a déjà une heure spécifique
  const hasTime = dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0 || dateObj.getSeconds() !== 0;
  
  if (!hasTime) {
    // Ajouter l'heure par défaut seulement si pas d'heure spécifiée
    const [hours, minutes, seconds] = defaultTime.split(':');
    dateObj.setHours(
      parseInt(hours || '0'),
      parseInt(minutes || '0'),
      parseInt(seconds || '0'),
      0
    );
  }
  
  // Format as ISO string
  return dateObj.toISOString();
}

  private formatTimeToDateTime(baseDate: any, timeString: string): string | null {
    if (!baseDate || !timeString) return null;
    
    let dateObj: Date;
    
    if (baseDate instanceof Date) {
      dateObj = new Date(baseDate);
    } else if (typeof baseDate === 'string') {
      dateObj = new Date(baseDate);
    } else {
      return null;
    }
    
    // Parse time string (format: "HH:MM")
    const timeParts = timeString.split(':');
    const hours = timeParts[0] ? parseInt(timeParts[0]) : 0;
    const minutes = timeParts[1] ? parseInt(timeParts[1]) : 0;
    
    dateObj.setHours(hours, minutes, 0, 0);
    
    return dateObj.toISOString();
  }

  // Input formatting helpers
  onDistanceBlur(): void {
    const distanceControl = this.tripForm.get('estimatedDistance');
    if (distanceControl && distanceControl.value) {
      const value = parseFloat(distanceControl.value);
      if (!isNaN(value)) {
        distanceControl.setValue(value.toFixed(1), { emitEvent: false });
      }
    }
  }

  onDurationBlur(): void {
    const durationControl = this.tripForm.get('estimatedDuration');
    if (durationControl && durationControl.value) {
      const value = parseFloat(durationControl.value);
      if (!isNaN(value)) {
        durationControl.setValue(value.toFixed(1), { emitEvent: false });
      }
    }
  }

  // Form validation helper
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
formatDateForDisplay(date: any): string {
    return this.datePipe.transform(date, 'dd MMM yyyy') || '';
  }

  // Dans la classe TripForm

// Méthode pour obtenir le nom du chauffeur
getSelectedDriverInfo(): string {
  const driverId = this.tripForm.get('driverId')?.value;
  if (!driverId) return 'Non sélectionné';
  
  const driver = this.drivers.find(d => d.id === driverId);
  return driver ? `${driver.name} (${driver.permisNumber})` : 'Chauffeur inconnu';
}

// Méthode pour calculer la vitesse moyenne
calculateAverageSpeed(): string {
  const distance = this.tripForm.get('estimatedDistance')?.value;
  const duration = this.tripForm.get('estimatedDuration')?.value;
  
  if (!distance || !duration || duration === 0) return '0';
  
  const speed = parseFloat(distance) / parseFloat(duration);
  return speed.toFixed(1);
}

// Méthode pour obtenir le libellé du statut
getTripStatusLabel(status: string): string {
  const statusOption = this.tripStatuses.find(s => s.value === status);
  return statusOption ? statusOption.label : 'Planifié';
}
// Ajoutez cette méthode après getTripStatusLabel
applySearchFilter(): void {
  const searchText = this.searchControl.value?.toLowerCase().trim() || '';
  
  if (!searchText) {
    this.filteredOrders = [...this.ordersForQuickAdd];
    return;
  }

  this.filteredOrders = this.ordersForQuickAdd.filter(order => {
    const customer = this.customers.find(c => c.id === order.customerId);
    if (!customer) return false;

    // Rechercher dans tous les champs
    return (
      customer.name.toLowerCase().includes(searchText) ||
      customer.matricule?.toLowerCase().includes(searchText) ||
      customer.adress?.toLowerCase().includes(searchText) ||
      order.reference.toLowerCase().includes(searchText) ||
      order.type?.toLowerCase().includes(searchText)
    );
  });
}

// Ajoutez aussi une méthode pour effacer la recherche
clearSearch(): void {
  this.searchControl.setValue('');
  this.filteredOrders = [...this.ordersForQuickAdd];
}
}