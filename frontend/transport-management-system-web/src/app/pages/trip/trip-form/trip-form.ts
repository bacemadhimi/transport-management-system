import { Component, HostListener, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { debounceTime } from 'rxjs';
import { ITraject, ICreateTrajectDto, ITrajectPoint } from '../../../types/traject';
import { TrajectFormSimpleComponent } from './traject-form-simple.component';
import { CdkDragDrop, CdkDrag, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { animate, style, transition, trigger } from '@angular/animations';
import Swal from 'sweetalert2';
import { ILocation } from '../../../types/location';
import { IConvoyeur } from '../../../types/convoyeur';

interface DialogData {
  tripId?: number;
}

@Component({
  selector: 'app-trip-form',
  standalone: true,
  templateUrl: './trip-form.html',
  styleUrls: ['./trip-form.scss'],
  imports: [ 
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    
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
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatRadioModule,
    CdkDrag,
    CdkDragHandle,
    CdkDropList
  ], 
  providers: [DatePipe],
  animations: [
    trigger('sequenceUpdate', [
      transition('* => updated', [
        animate('0.5s ease', style({ 
          transform: 'scale(1.1)',
          color: '#f59e0b'
        }))
      ])
    ])
  ]
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
  isDragging = false;
  previousOrder: number[] = [];
  dragDisabled = false;
  convoyeurs: IConvoyeur[] = [];
  loadingConvoyeurs = false;
  
  // Trajects
  trajects: ITraject[] = [];
  selectedTraject: ITraject | null = null;
  selectedTrajectControl = new FormControl<number | null>(null);
  trajectMode: 'predefined' | 'new' | null = null;
  saveAsTraject = false;
  trajectName = '';
  loadingTrajects = false;
  hasMadeTrajectChoice = false;
  
  // Édition de traject
  isEditingTrajectName = false;
  editingTrajectName = '';
  isEditingPoint: number | null = null;
  editingPointAddress = '';
  savingTrajectChanges = false;
  hasUnsavedTrajectChanges = false;
  debounceTimer: any;
  
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
  deletingTraject = false;
  startLocationId = new FormControl<number | null>(null, Validators.required);
  endLocationId = new FormControl<number | null>(null, Validators.required);
  locations: ILocation[] = [];
  activeLocations: ILocation[] = [];
  loadingLocations = false;
  
  // UI state
  showDeliveriesSection = false;

  constructor(
    private fb: FormBuilder,
    private http: Http,
    private dialogRef: MatDialogRef<TripForm>,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.deliveries = this.fb.array([]);
  }

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.loadLocations();
    if (this.data.tripId) {
      this.loadTrip(this.data.tripId);
      // For existing trips, always use 'new' mode
      this.trajectMode = 'new';
      this.hasMadeTrajectChoice = true;
      this.showDeliveriesSection = true; // Show deliveries for editing existing trip
    } else {
      this.loadTrajects();
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
      deliveries: this.deliveries,
      startLocationId: [null, Validators.required],
      endLocationId: [null, Validators.required],
      convoyeurId: [null], 
    });
  }

  private loadData(): void {
    this.loadTrucks();
    this.loadDrivers();
    this.loadConvoyeurs();
    this.loadCustomers();
    this.loadAvailableOrders();
  }

  private loadTrajects(): void {
    this.loadingTrajects = true;
    this.http.getAllTrajects().subscribe({
      next: (trajects: ITraject[]) => {
        this.trajects = trajects.sort((a, b) => a.name.localeCompare(b.name));
        this.loadingTrajects = false;
      },
      error: (error) => {
        console.error('Error loading trajects:', error);
        this.loadingTrajects = false;
        this.snackBar.open('Erreur lors du chargement des trajects prédéfinis', 'Fermer', { duration: 3000 });
      }
    });
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
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loadingOrders = false;
        this.snackBar.open('Erreur lors du chargement des commandes', 'Fermer', { duration: 3000 });
      }
    });
  }

  private loadTrip(tripId: number): void {
    this.loading = true;
    this.http.getTrip(tripId).subscribe({
      next: (response: any) => {
        const trip = response.data || response;
        
        if (!trip) {
          console.error('No trip data found in response');
          this.snackBar.open('Aucune donnée de voyage trouvée', 'Fermer', { duration: 3000 });
          this.loading = false;
          return;
        }

        const toLocalDate = (iso: string | null): Date | null => {
          if (!iso || iso.startsWith('0001-01-01')) return null;
          const d = new Date(iso);
          return new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate()
          );
        };

        const startDate = toLocalDate(trip.estimatedStartDate);
        const endDate = toLocalDate(trip.estimatedEndDate);
      
        const truckId = trip.truckId && trip.truckId !== 0 ? trip.truckId : trip.truck?.id ?? null;
        const driverId = trip.driverId && trip.driverId !== 0 ? trip.driverId : trip.driver?.id ?? null;
        const startLocationId = trip.startLocationId || trip.startLocation?.id || null;
        const endLocationId = trip.endLocationId || trip.endLocation?.id || null;
        const convoyeurId = trip.convoyeurId && trip.convoyeurId !== 0 ? trip.convoyeurId : trip.convoyeur?.id ?? null;
      
        this.tripForm.patchValue({
          estimatedStartDate: startDate,
          estimatedEndDate: endDate,
          truckId: truckId,
          driverId: driverId,
          estimatedDistance: trip.estimatedDistance || 0,
          estimatedDuration: trip.estimatedDuration || 0,
          tripStatus: trip.tripStatus || TripStatus.Planned,
          startLocationId: startLocationId,
          endLocationId: endLocationId,
          convoyeurId: convoyeurId,
        });

        setTimeout(() => {
          if (truckId) {
            this.tripForm.get('truckId')?.setValue(truckId);
          }
          if (driverId) {
            this.tripForm.get('driverId')?.setValue(driverId);
          }
        }, 100);
      
        this.deliveries.clear();
        
        const deliveries = trip.deliveries || [];
      
        if (deliveries.length > 0) {
          const sortedDeliveries = [...deliveries].sort((a, b) => 
            (a.sequence || 0) - (b.sequence || 0)
          );
          
          sortedDeliveries.forEach(delivery => {
            this.addDelivery(delivery);
          });
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

  // Traject Mode Change Handler
  onTrajectModeChange(): void {
    this.hasMadeTrajectChoice = true;
    
    if (this.trajectMode === 'predefined') {
      this.deliveries.clear();
      this.clearTrajectSelection();
      if (this.trajects.length === 0) {
        this.loadTrajects();
      }
    } else if (this.trajectMode === 'new') {
      this.clearTrajectSelection();
      // Don't auto-add delivery for new mode
    }
    
    // Hide deliveries section when changing mode
    this.showDeliveriesSection = false;
  }
  private updateEstimationsFromTraject(traject: ITraject): void {
    const pointsCount = traject.points.length;
    const estimatedDistance = pointsCount * 15;
    const estimatedDuration = pointsCount * 0.75;
    
    this.tripForm.patchValue({
      estimatedDistance: estimatedDistance.toFixed(1),
      estimatedDuration: estimatedDuration.toFixed(1)
    });
  }

  // Clear traject selection
  clearTrajectSelection(): void {
    // Check if there's any delivery data that would be lost
    if (this.selectedTraject && this.hasDeliveryData()) {
      const confirmed = confirm('Changer de traject effacera les livraisons que vous avez ajoutées. Voulez-vous continuer ?');
      if (!confirmed) {
        // Revert the selection
        this.selectedTrajectControl.setValue(this.selectedTraject?.id || null);
        return;
      }
    }
    
    this.selectedTraject = null;
    this.selectedTrajectControl.setValue(null);
    this.deliveries.clear();
  }

  // Format traject date for display
  formatTrajectDate(dateString: string): string {
    return this.datePipe.transform(dateString, 'dd/MM/yyyy') || '';
  }

  // Calculate estimated distance for traject
  calculateTrajectDistance(): number {
    if (!this.selectedTraject || !this.selectedTraject.points) {
      return 0;
    }
    
    const distance = this.selectedTraject.points.length * 15;
    return Math.round(distance);
  }

  // Save as traject checkbox change handler
onSaveAsTrajectChange(checked: boolean): void {
  this.saveAsTraject = checked;
  if (!checked) {
    this.trajectName = '';
  } else {
    // Generate a default name if none provided
    if (!this.trajectName) {
      const startLocationName = this.getSelectedStartLocationInfo();
      const endLocationName = this.getSelectedEndLocationInfo();
      
      // Only generate name if both locations are selected and valid
      if (startLocationName !== 'Non sélectionné' && 
          endLocationName !== 'Non sélectionné' &&
          startLocationName !== 'Lieu inconnu' && 
          endLocationName !== 'Lieu inconnu') {
        
        // Format: "Start Location - End Location"
        this.trajectName = `${startLocationName} - ${endLocationName}`;
        
      } else if (this.deliveries.length > 0) {
        // Fallback to client names if locations not selected
        const firstClient = this.getClientName(this.deliveryControls[0]?.get('customerId')?.value);
        const lastClient = this.getClientName(this.deliveryControls[this.deliveries.length - 1]?.get('customerId')?.value);
        
        if (firstClient && lastClient && firstClient !== lastClient) {
          this.trajectName = `${firstClient} - ${lastClient}`;
        } else if (this.deliveries.length > 0) {
          this.trajectName = `Trajet avec ${this.deliveries.length} livraisons`;
        }
      }
    }
  }
}

  // Delivery management
  get deliveryControls(): FormGroup[] {
    return this.deliveries.controls as FormGroup[];
  }

  addDelivery(deliveryData?: any): void {
    const sequence = this.deliveries.length + 1;
    const plannedTime = deliveryData?.plannedTime
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
    
    // Show deliveries section when first delivery is added
    if (!this.showDeliveriesSection) {
      this.showDeliveriesSection = true;
    }
  }

  removeDelivery(index: number): void {
    this.deliveries.removeAt(index);
    this.updateDeliverySequences();
    
    // Hide deliveries section if no deliveries left
    if (this.deliveries.length === 0) {
      this.showDeliveriesSection = false;
    }
  }

  onCustomerChange(index: number): void {
    const deliveryGroup = this.deliveryControls[index];
    const customerId = deliveryGroup.get('customerId')?.value;
    
    if (customerId) {
      deliveryGroup.get('orderId')?.setValue('');
      
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
    
    this.ordersForQuickAdd = this.ordersForQuickAdd.filter(o => o.id !== order.id);
    this.filteredOrders = this.filteredOrders.filter(o => o.id !== order.id);
    
    this.snackBar.open('Commande ajoutée au trajet', 'Fermer', { duration: 2000 });
  }

  // Form submission
  onSubmit(): void {
    if (this.saveAsTraject && !this.trajectName.trim()) {
      this.snackBar.open('Veuillez saisir un nom pour le traject', 'Fermer', { duration: 3000 });
      return;
    }
    if (!this.tripForm.get('startLocationId')?.value || !this.tripForm.get('endLocationId')?.value) {
    this.snackBar.open('Veuillez sélectionner les lieux de départ et d\'arrivée', 'Fermer', { duration: 3000 });
    this.tripForm.get('startLocationId')?.markAsTouched();
    this.tripForm.get('endLocationId')?.markAsTouched();
    return;
    }
    if (this.tripForm.invalid || this.deliveries.length === 0) {
      this.markFormGroupTouched(this.tripForm);
      this.deliveryControls.forEach(group => this.markFormGroupTouched(group));
      
      if (this.deliveries.length === 0) {
        this.snackBar.open('Ajoutez au moins une livraison', 'Fermer', { duration: 3000 });
      }
      return;
    }
    if (!this.validateCapacity()) {
        return;
      }
    const formValue = this.tripForm.value;
    
    const deliveries = this.prepareDeliveries(formValue.estimatedStartDate);
    
    if (this.data.tripId) {
      this.updateTrip(formValue, deliveries);
    } else {
      this.createTrip(formValue, deliveries);
    }
  }

  private createTrip(formValue: any, deliveries: CreateDeliveryDto[]): void {

    const startLocationId = this.tripForm.get('startLocationId')?.value;
    const endLocationId = this.tripForm.get('endLocationId')?.value;
    const createTripData: CreateTripDto = {
      estimatedDistance: parseFloat(formValue.estimatedDistance) || 0,
      estimatedDuration: parseFloat(formValue.estimatedDuration) || 0,
      estimatedStartDate: this.formatDateWithTime(formValue.estimatedStartDate, '08:00:00'),
      estimatedEndDate: this.formatDateWithTime(formValue.estimatedEndDate, '18:00:00'),
      truckId: parseInt(formValue.truckId),
      driverId: parseInt(formValue.driverId),
      deliveries: deliveries,
      startLocationId: startLocationId,
      endLocationId: endLocationId,
      trajectId: this.trajectMode === 'predefined' && this.selectedTraject?.id 
      ? this.selectedTraject.id 
      : null,
      convoyeurId: formValue.convoyeurId ? parseInt(formValue.convoyeurId) : null,

    };

    console.log('Creating trip with data:', JSON.stringify(createTripData, null, 2));
    
    this.loading = true;
    this.http.createTrip(createTripData).subscribe({
      next: (response: any) => {
        const tripId = response.id || response.data?.id;
        
        if (this.saveAsTraject && this.trajectName.trim() && this.trajectMode === 'new') {
          this.createTrajectFromDeliveries().then(() => {
            this.snackBar.open('Voyage créé et traject enregistré avec succès', 'Fermer', { duration: 3000 });
            this.dialogRef.close(true);
            this.loading = false;
          }).catch(error => {
            console.error('Error creating traject:', error);
            this.snackBar.open('Voyage créé mais erreur lors de l\'enregistrement du traject', 'Fermer', { duration: 3000 });
            this.dialogRef.close(true);
            this.loading = false;
          });
        } else {
          this.snackBar.open('Voyage créé avec succès', 'Fermer', { duration: 3000 });
          this.dialogRef.close(true);
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Create error:', error);
        console.error('Error details:', error.error);
        this.snackBar.open('Erreur lors de la création du voyage', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private updateTrip(formValue: any, deliveries: CreateDeliveryDto[]): void {
    const updateTripData: UpdateTripDto = {
      estimatedDistance: parseFloat(formValue.estimatedDistance) || 0,
      estimatedDuration: parseFloat(formValue.estimatedDuration) || 0,
      estimatedStartDate: this.formatDateWithTime(formValue.estimatedStartDate, '08:00:00'),
      estimatedEndDate: this.formatDateWithTime(formValue.estimatedEndDate, '18:00:00'),
      truckId: parseInt(formValue.truckId),
      driverId: parseInt(formValue.driverId),
      tripStatus: formValue.tripStatus,
      deliveries: deliveries,
      convoyeurId: formValue.convoyeurId ? parseInt(formValue.convoyeurId) : null,
    };

    console.log('Updating trip with data:', JSON.stringify(updateTripData, null, 2));
    
    this.loading = true;
    this.http.updateTrip(this.data.tripId!, updateTripData).subscribe({
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

private async createTrajectFromDeliveries(): Promise<void> {
  const points = this.deliveryControls.map((group, index) => {
    const address = group.get('deliveryAddress')?.value;
    const customerId = group.get('customerId')?.value;
    const clientName = customerId ? this.getClientName(customerId) : undefined;
    
    const point: any = {
      location: address || `Point ${index + 1}`,
      order: index + 1
    };
    
    // Only add clientId if a customer is selected
    if (customerId) {
      point.clientId = parseInt(customerId);
      point.clientName = clientName;
    }
    
    return point;
  });

  // Get start and end location IDs from the trip form
  const startLocationId = this.tripForm.get('startLocationId')?.value;
  const endLocationId = this.tripForm.get('endLocationId')?.value;

  // Create traject data - adjust this based on your actual ICreateTrajectDto interface
  const trajectData: any = {
    name: this.trajectName.trim(),
    points: points
  };

  // Only add location IDs if they exist and are valid
  if (startLocationId && !isNaN(parseInt(startLocationId))) {
    trajectData.startLocationId = parseInt(startLocationId);
  }
  
  if (endLocationId && !isNaN(parseInt(endLocationId))) {
    trajectData.endLocationId = parseInt(endLocationId);
  }

  console.log('Creating traject with data:', trajectData);

  return new Promise((resolve, reject) => {
    this.http.createTraject(trajectData).subscribe({
      next: (traject: ITraject) => {
        console.log('Traject créé avec les clients:', traject);
        resolve();
      },
      error: (error) => {
        console.error('Erreur création traject:', error);
        reject(error);
      }
    });
  });
}


private prepareDeliveries(baseDate: any): any[] {
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
    
    const hasTime = dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0 || dateObj.getSeconds() !== 0;
    
    if (!hasTime) {
      const [hours, minutes, seconds] = defaultTime.split(':');
      dateObj.setHours(
        parseInt(hours || '0'),
        parseInt(minutes || '0'),
        parseInt(seconds || '0'),
        0
      );
    }
    
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

  // Search filter
  applySearchFilter(): void {
    const searchText = this.searchControl.value?.toLowerCase().trim() || '';
    
    if (!searchText) {
      this.filteredOrders = [...this.ordersForQuickAdd];
      return;
    }

    this.filteredOrders = this.ordersForQuickAdd.filter(order => {
      const customer = this.customers.find(c => c.id === order.customerId);
      if (!customer) return false;

      return (
        customer.name.toLowerCase().includes(searchText) ||
        customer.matricule?.toLowerCase().includes(searchText) ||
        customer.adress?.toLowerCase().includes(searchText) ||
        order.reference.toLowerCase().includes(searchText) ||
        order.type?.toLowerCase().includes(searchText)
      );
    });
  }

  // Clear search
  clearSearch(): void {
    this.searchControl.setValue('');
    this.filteredOrders = [...this.ordersForQuickAdd];
  }

  // Open traject form dialog
  openTrajectForm(): void {
    const dialogRef = this.dialog.open(TrajectFormSimpleComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['dialog-overlay', 'wide-dialog'],
      data: {
        onTrajectCreated: (traject: ITraject) => {
          this.trajects.push(traject);
          this.trajects.sort((a, b) => a.name.localeCompare(b.name));
          
          this.selectedTrajectControl.setValue(traject.id);
          this.onTrajectSelected(traject.id);
        }
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Traject créé:', result);
      }
    });
  }

  // ==================== DRAG & DROP POUR LES LIVRAISONS ====================
  
  drop(event: CdkDragDrop<string[]>): void {
    this.isDragging = false;
    
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.previousOrder = this.deliveryControls.map((_, idx) => idx);

    const deliveryArray = this.deliveries;
    const movedDelivery = deliveryArray.at(event.previousIndex);
    
    const deliveryCopy = this.fb.group({
      customerId: [movedDelivery.get('customerId')?.value, Validators.required],
      orderId: [movedDelivery.get('orderId')?.value, Validators.required],
      deliveryAddress: [movedDelivery.get('deliveryAddress')?.value, [Validators.required, Validators.maxLength(500)]],
      sequence: [movedDelivery.get('sequence')?.value, [Validators.required, Validators.min(1)]],
      plannedTime: [movedDelivery.get('plannedTime')?.value],
      notes: [movedDelivery.get('notes')?.value || '']
    });

    deliveryArray.removeAt(event.previousIndex);
    deliveryArray.insert(event.currentIndex, deliveryCopy);

    this.updateDeliverySequences();
    
    const fromPosition = event.previousIndex + 1;
    const toPosition = event.currentIndex + 1;
    const direction = event.previousIndex < event.currentIndex ? 'vers le bas' : 'vers le haut';
    const message = `Livraison ${fromPosition} déplacée ${direction} à la position ${toPosition}`;
    
    this.snackBar.open(message, 'Fermer', { duration: 2000 });
    
    this.deliveries.updateValueAndValidity();
    
    setTimeout(() => {
      this.previousOrder = [];
    }, 500);
  }

  onDragStarted(): void {
    this.isDragging = true;
    this.dragDisabled = true;
  }

  onDragEnded(): void {
    setTimeout(() => {
      this.isDragging = false;
      this.dragDisabled = false;
    }, 100);
  }

  // Check if drag is disabled (for predefined traject)
  isDragDisabled(): boolean {
    return false; // Always allow drag for both modes
  }

  // Helper methods for visual feedback
  isSequenceUpdated(index: number): boolean {
    if (!this.previousOrder.length || this.previousOrder.length !== this.deliveryControls.length) {
      return false;
    }
    return this.previousOrder[index] !== index;
  }

  hasSequenceChanged(index: number, deliveryGroup: FormGroup): boolean {
    const currentSequence = deliveryGroup.get('sequence')?.value;
    return currentSequence !== (index + 1);
  }

  // Enhanced sequence update with time adjustment
  updateDeliverySequences(): void {
    const sequenceUpdates: { index: number, oldValue: number, newValue: number }[] = [];
    const hasPlannedTimes = this.deliveryControls.some(group => group.get('plannedTime')?.value);
    
    this.deliveryControls.forEach((group, index) => {
      const oldValue = group.get('sequence')?.value;
      const newValue = index + 1;
      
      if (oldValue !== newValue) {
        sequenceUpdates.push({ index, oldValue, newValue });
        group.get('sequence')?.setValue(newValue, { emitEvent: false });
        
        if (hasPlannedTimes) {
          this.updatePlannedTimeForDelivery(group, index);
        }
      }
    });
    
    if (sequenceUpdates.length > 0) {
      console.log('Sequence updates:', sequenceUpdates);
    }
    
    this.updateEstimatedValuesAfterReorder();
  }

  // Update planned time for a specific delivery
  private updatePlannedTimeForDelivery(deliveryGroup: FormGroup, index: number): void {
    const plannedTimeControl = deliveryGroup.get('plannedTime');
    if (plannedTimeControl && plannedTimeControl.value) {
      const currentTime = plannedTimeControl.value;
      const [hours, minutes] = currentTime.split(':').map(Number);
      
      const minutesToAdd = index * 45;
      const newDate = new Date();
      newDate.setHours(hours, minutes + minutesToAdd, 0, 0);
      
      const newHours = newDate.getHours().toString().padStart(2, '0');
      const newMinutes = newDate.getMinutes().toString().padStart(2, '0');
      const newTime = `${newHours}:${newMinutes}`;
      
      if (currentTime !== newTime) {
        plannedTimeControl.setValue(newTime, { emitEvent: false });
      }
    }
  }

  // Update estimated values after reorder
  private updateEstimatedValuesAfterReorder(): void {
    const baseDurationPerDelivery = 0.75;
    const travelTimeBetween = 0.25;
    const totalDeliveries = this.deliveries.length;
    
    if (totalDeliveries === 0) return;
    
    const totalDuration = (baseDurationPerDelivery * totalDeliveries) + 
                         (travelTimeBetween * Math.max(0, totalDeliveries - 1));
    
    const distancePerDelivery = 15;
    const distanceBetween = 5;
    const totalDistance = (distancePerDelivery * totalDeliveries) + 
                         (distanceBetween * Math.max(0, totalDeliveries - 1));
    
    const currentDuration = parseFloat(this.tripForm.get('estimatedDuration')?.value || '0');
    const currentDistance = parseFloat(this.tripForm.get('estimatedDistance')?.value || '0');
    
    if (Math.abs(currentDuration - totalDuration) > 0.1) {
      this.tripForm.get('estimatedDuration')?.setValue(totalDuration.toFixed(1), { emitEvent: true });
    }
    
    if (Math.abs(currentDistance - totalDistance) > 0.1) {
      this.tripForm.get('estimatedDistance')?.setValue(totalDistance.toFixed(1), { emitEvent: true });
    }
  }

  // ==================== ÉDITION DE TRAJECT ====================

  // Méthode pour démarrer l'édition du nom du traject
  startTrajectNameEdit(): void {
    this.isEditingTrajectName = true;
    this.editingTrajectName = this.selectedTraject?.name || '';
    
    setTimeout(() => {
      const input = document.querySelector('.traject-name-edit input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }

  // Sauvegarder le nom du traject
  async saveTrajectName(): Promise<void> {
    if (!this.selectedTraject || !this.editingTrajectName.trim()) {
      this.cancelTrajectNameEdit();
      return;
    }

    const newName = this.editingTrajectName.trim();
    if (newName === this.selectedTraject.name) {
      this.cancelTrajectNameEdit();
      return;
    }

    try {
      this.savingTrajectChanges = true;
      
      this.selectedTraject.name = newName;
      
      const index = this.trajects.findIndex(t => t.id === this.selectedTraject!.id);
      if (index !== -1) {
        this.trajects[index].name = newName;
      }
      
      await this.saveTrajectChanges();
      
      this.snackBar.open('Nom du traject mis à jour', 'Fermer', { duration: 2000 });
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du nom:', error);
      this.snackBar.open('Erreur lors de la mise à jour du nom', 'Fermer', { duration: 3000 });
    } finally {
      this.isEditingTrajectName = false;
      this.savingTrajectChanges = false;
    }
  }

  // Annuler l'édition du nom
  cancelTrajectNameEdit(): void {
    this.isEditingTrajectName = false;
    this.editingTrajectName = '';
  }

  // Méthode pour démarrer l'édition d'un point
  startPointEdit(index: number, address: string | undefined): void {
    this.isEditingPoint = index;
    this.editingPointAddress = address ?? '';
    
    setTimeout(() => {
      const textarea = document.querySelector('.point-address-edit textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 100);
  }

  // Sauvegarder l'adresse d'un point
  async savePointAddress(index: number): Promise<void> {
    if (this.isEditingPoint === null || !this.selectedTraject) return;
    
    const newAddress = this.editingPointAddress.trim();
    if (!newAddress || newAddress === this.selectedTraject.points[index].location) {
      this.cancelPointEdit();
      return;
    }

    try {
      this.savingTrajectChanges = true;
      
      this.selectedTraject.points[index].location = newAddress;
      
      this.debouncedSaveTrajectChanges();
      
      this.snackBar.open('Adresse mise à jour', 'Fermer', { duration: 2000 });
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'adresse:', error);
      this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 3000 });
    } finally {
      this.isEditingPoint = null;
      this.editingPointAddress = '';
      this.savingTrajectChanges = false;
    }
  }

  // Annuler l'édition d'un point
  cancelPointEdit(): void {
    this.isEditingPoint = null;
    this.editingPointAddress = '';
  }

  // Ajouter un nouveau point au traject
  addNewTrajectPoint(): void {
    if (!this.selectedTraject) return;
    
    const newPoint: ITrajectPoint = {
      location: '',
      order: this.selectedTraject.points.length + 1
    };
    
    this.selectedTraject.points.push(newPoint);
    this.hasUnsavedTrajectChanges = true;
    
    setTimeout(() => {
      this.startPointEdit(this.selectedTraject!.points.length - 1, '');
    }, 100);
  }

  // Supprimer un point du traject
  async deleteTrajectPoint(index: number): Promise<void> {
    if (!this.selectedTraject || this.selectedTraject.points.length <= 1) return;
    
    // Confirmation simple (vous pouvez ajouter une boîte de dialogue de confirmation si nécessaire)
    const confirmed = confirm('Êtes-vous sûr de vouloir supprimer ce point du traject ?');
    if (!confirmed) return;

    try {
      this.savingTrajectChanges = true;
      
      this.selectedTraject!.points.splice(index, 1);
      
      this.selectedTraject!.points.forEach((point, i) => {
        point.order = i + 1;
      });
      
      await this.saveTrajectChanges();
      
      this.snackBar.open('Point supprimé', 'Fermer', { duration: 2000 });
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
    } finally {
      this.savingTrajectChanges = false;
    }
  }

  // Drag & Drop pour les points du traject
  async dropTrajectPoint(event: CdkDragDrop<ITrajectPoint[]>): Promise<void> {
    if (!this.selectedTraject) return;
    
    console.log('Événement de drag & drop:', event);
    
    if (event.previousIndex === event.currentIndex) return;
    
    // Déplacer l'élément dans le tableau
    moveItemInArray(this.selectedTraject.points, event.previousIndex, event.currentIndex);
    
    // Mettre à jour les ordres
    this.updateTrajectPointOrders();
    
    // Sauvegarder
    this.hasUnsavedTrajectChanges = true;
    this.debouncedSaveTrajectChanges();
  }

  // Mettre à jour les ordres des points
  private updateTrajectPointOrders(): void {
    if (!this.selectedTraject) return;
    
    this.selectedTraject.points.forEach((point, index) => {
      point.order = index + 1;
    });
  }

  // Méthode pour sauvegarder les modifications du traject
async saveTrajectChanges(): Promise<void> {
  if (!this.selectedTraject) return;
  
  try {
    this.savingTrajectChanges = true;
    
    const trajectData: any = {
      name: this.selectedTraject.name,
      points: this.selectedTraject.points.map(point => ({
        location: point.location,
        order: point.order
      }))
    };
    
    let result: any;
    if (this.selectedTraject.id) {
      result = await this.http.updateTraject(this.selectedTraject.id, trajectData).toPromise();
    } else {
      result = await this.http.createTraject(trajectData).toPromise();
    }
    
    if (result && result.id) {
      // Mettre à jour le traject dans la liste
      const index = this.trajects.findIndex(t => t.id === result.id);
      if (index !== -1) {
        this.trajects[index] = result;
      } else {
        this.trajects.push(result);
      }
      
      // Trier la liste en vérifiant que tous les éléments existent
      this.trajects = this.trajects
        .filter(t => t && t.name) // Filtrer les éléments undefined/null
        .sort((a, b) => {
          if (!a || !b || !a.name || !b.name) return 0;
          return a.name.localeCompare(b.name);
        });
      
      // Mettre à jour le traject sélectionné
      this.selectedTraject = result;
      
      // IMPORTANT: Maintenir la sélection dans le contrôle
      this.selectedTrajectControl.setValue(result.id);
    }
    
    this.hasUnsavedTrajectChanges = false;
    
    this.snackBar.open('Traject mis à jour avec succès', 'Fermer', { duration: 2000 });
    
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du traject:', error);
    this.snackBar.open('Erreur lors de la sauvegarde', 'Fermer', { duration: 3000 });
  } finally {
    this.savingTrajectChanges = false;
  }
}

  // Méthode avec debounce pour la sauvegarde auto
  debouncedSaveTrajectChanges(): void {
    this.hasUnsavedTrajectChanges = true;
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      if (this.hasUnsavedTrajectChanges) {
        this.saveTrajectChanges();
      }
    }, 2000);
  }

  // ==================== MÉTHODES UTILITAIRES SUPPLEMENTAIRES ====================

  shouldShowTimelineSummary(): boolean {
    // Only show timeline summary for "new" traject mode, not for predefined trajects
    return this.deliveries.length > 0  && this.trajectMode !== null;
  }

  getDeliveryStepClass(index: number, deliveryGroup: FormGroup): string {
    const classes = ['timeline-step', 'delivery-step'];
    
    if (this.isSequenceUpdated(index)) {
      classes.push('sequence-updated');
    }
    
    if (this.isDragging) {
      classes.push('dragging-active');
    }
    
    const customerId = deliveryGroup.get('customerId')?.value;
    const orderId = deliveryGroup.get('orderId')?.value;
    const address = deliveryGroup.get('deliveryAddress')?.value;
    
    if (customerId && orderId && address) {
      classes.push('delivery-complete');
    } else {
      classes.push('delivery-incomplete');
    }
    
    return classes.join(' ');
  }

  getStepMarkerStyle(deliveryGroup: FormGroup): any {
    const customerId = deliveryGroup.get('customerId')?.value;
    const orderId = deliveryGroup.get('orderId')?.value;
    const address = deliveryGroup.get('deliveryAddress')?.value;
    
    if (customerId && orderId && address) {
      return {
        'background': 'linear-gradient(135deg, #10b981, #059669)',
        'border': '3px solid white',
        'box-shadow': '0 4px 12px rgba(16, 185, 129, 0.3)'
      };
    } else {
      return {
        'background': 'linear-gradient(135deg, #94a3b8, #64748b)',
        'border': '3px solid white',
        'box-shadow': '0 4px 12px rgba(148, 163, 184, 0.3)'
      };
    }
  }

  formatTimeForDisplay(timeString: string): string {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    
    return this.datePipe.transform(date, 'HH:mm') || timeString;
  }

  calculateDeliveryTime(sequence: number): string {
    const startHour = 8;
    const intervalMinutes = 45;
    
    const totalMinutes = startHour * 60 + ((sequence - 1) * intervalMinutes);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  getDeliveryStatus(deliveryGroup: FormGroup): string {
    const customerId = deliveryGroup.get('customerId')?.value;
    const orderId = deliveryGroup.get('orderId')?.value;
    const address = deliveryGroup.get('deliveryAddress')?.value;
    
    if (!customerId && !orderId) return 'À compléter';
    if (!customerId) return 'Client manquant';
    if (!orderId) return 'Commande manquante';
    if (!address || address.trim().length < 5) return 'Adresse incomplète';
    
    return 'Prête';
  }

  getDeliveryStatusColor(deliveryGroup: FormGroup): string {
    const status = this.getDeliveryStatus(deliveryGroup);
    
    switch (status) {
      case 'Prête':
        return 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))';
      case 'À compléter':
        return 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))';
      case 'Client manquant':
        return 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))';
      case 'Commande manquante':
        return 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))';
      case 'Adresse incomplète':
        return 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))';
      default:
        return 'linear-gradient(135deg, rgba(148, 163, 184, 0.1), rgba(100, 116, 139, 0.1))';
    }
  }

  // Reset all sequences to natural order
  resetSequences(): void {
    this.deliveryControls.forEach((group, index) => {
      group.get('sequence')?.setValue(index + 1, { emitEvent: false });
    });
    
    this.snackBar.open('Ordres réinitialisés', 'Fermer', { duration: 2000 });
  }

  // Sort deliveries by sequence
  sortDeliveriesBySequence(): void {
    const sortedDeliveries = [...this.deliveryControls]
      .sort((a, b) => {
        const seqA = a.get('sequence')?.value || 0;
        const seqB = b.get('sequence')?.value || 0;
        return seqA - seqB;
      });
    
    this.deliveries.clear();
    sortedDeliveries.forEach(delivery => {
      this.deliveries.push(delivery);
    });
    
    this.snackBar.open('Livraisons triées par ordre', 'Fermer', { duration: 2000 });
  }

  // Validate delivery sequence
  validateDeliverySequence(): boolean {
    const sequences = this.deliveryControls.map(group => group.get('sequence')?.value);
    const uniqueSequences = new Set(sequences);
    
    if (uniqueSequences.size !== sequences.length) {
      this.snackBar.open('Attention: Des numéros d\'ordre sont en double', 'Fermer', { duration: 3000 });
      return false;
    }
    
    const minSequence = Math.min(...sequences);
    const maxSequence = Math.max(...sequences);
    
    if (minSequence !== 1) {
      this.snackBar.open('Attention: L\'ordre doit commencer à 1', 'Fermer', { duration: 3000 });
      return false;
    }
    
    if (maxSequence !== sequences.length) {
      this.snackBar.open('Attention: L\'ordre n\'est pas continu', 'Fermer', { duration: 3000 });
      return false;
    }
    
    return true;
  }

  // Auto-calculate all planned times
  autoCalculatePlannedTimes(): void {
    this.deliveryControls.forEach((group, index) => {
      const calculatedTime = this.calculateDeliveryTime(index + 1);
      group.get('plannedTime')?.setValue(calculatedTime, { emitEvent: false });
    });
    
    this.snackBar.open('Heures planifiées calculées automatiquement', 'Fermer', { duration: 2000 });
  }

  // Calculate arrival time based on start time and duration
  calculateArrivalTime(): string {
    const startDate = this.tripForm.get('estimatedStartDate')?.value;
    const duration = parseFloat(this.tripForm.get('estimatedDuration')?.value || '0');
    
    if (!startDate || !duration) return 'Non calculable';
    
    const start = new Date(startDate);
    start.setHours(8, 0, 0, 0);
    
    const arrival = new Date(start.getTime() + (duration * 60 * 60 * 1000));
    return this.datePipe.transform(arrival, 'HH:mm') || '';
  }

  // Get count of completed deliveries
  getCompletedDeliveriesCount(): number {
    return this.deliveryControls.filter(group => {
      const customerId = group.get('customerId')?.value;
      const orderId = group.get('orderId')?.value;
      const address = group.get('deliveryAddress')?.value;
      return customerId && orderId && address && address.trim().length > 5;
    }).length;
  }

  // Edit delivery method
  editDelivery(index: number): void {
    const deliveryElement = document.querySelector(`[formGroupName="${index}"]`);
    if (deliveryElement) {
      deliveryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      deliveryElement.classList.add('editing');
      setTimeout(() => {
        deliveryElement.classList.remove('editing');
      }, 2000);
    }
    
    this.snackBar.open(`Modification de la livraison ${index + 1}`, 'Fermer', { duration: 2000 });
  }

  // Get delivery completion percentage
  getDeliveryCompletionPercentage(): number {
    const total = this.deliveries.length * 3;
    if (total === 0) return 0;
    
    let completed = 0;
    this.deliveryControls.forEach(group => {
      if (group.get('customerId')?.value) completed++;
      if (group.get('orderId')?.value) completed++;
      if (group.get('deliveryAddress')?.value?.trim().length > 5) completed++;
    });
    
    return Math.round((completed / total) * 100);
  }

  // Export timeline as image or PDF (placeholder)
  exportTimeline(): void {
    this.snackBar.open('Export du récapitulatif en cours...', 'Fermer', { duration: 2000 });
  }

  // Print timeline
  printTimeline(): void {
    window.print();
  }

  // Gérer la sauvegarde avant de quitter
  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedTrajectChanges) {
      event.preventDefault();
      event.returnValue = 'Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?';
    }
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  // Méthode pour changer de traject avec confirmation
  changeTraject(): void {
    if (this.selectedTraject && this.hasUnsavedTrajectChanges) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées dans le traject. Voulez-vous vraiment changer sans sauvegarder ?');
      if (!confirmed) {
        return;
      }
    }
    
    this.clearTrajectSelection();
  }

  // Vérifier si les livraisons ont des données
  hasDeliveryData(): boolean {
    return this.deliveries.length > 0;
  }

  // Dans votre composant TripFormComponent
deleteTraject(): void {
  if (!this.selectedTraject || !this.selectedTraject.id) {
    return;
  }

  Swal.fire({
    title: 'Supprimer le traject ?',
    text: `Êtes-vous sûr de vouloir supprimer le traject "${this.selectedTraject.name}" ? Cette action est irréversible.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Oui, supprimer',
    cancelButtonText: 'Annuler',
    reverseButtons: true,
    backdrop: true,
    allowOutsideClick: false,
    allowEscapeKey: false
  }).then((result) => {
    if (result.isConfirmed) {
      this.performTrajectDeletion();
    }
  });
}

private performTrajectDeletion(): void {
  const trajectId = this.selectedTraject?.id;
  
  // Appel API
  this.http.deleteTraject(trajectId).subscribe({
    next: () => {
      Swal.fire({
        title: 'Succès',
        text: 'Traject supprimé avec succès',
        icon: 'success',
        showConfirmButton: false,
        timer: 1500
      }).then(() => {
        // Réinitialiser la sélection
        this.selectedTraject = null;
        this.selectedTrajectControl.setValue(null);
        
        // Recharger la liste des trajects
        this.loadTrajects();
        
        // Optionnel : Notifier le parent si nécessaire
        // this.trajectDeleted.emit(trajectId);
      });
    },
    error: (error) => {
      console.error('Erreur lors de la suppression:', error);
      
      // Gérer différentes erreurs
      let errorMessage = 'Erreur lors de la suppression du traject';
      
      if (error.status === 404) {
        errorMessage = 'Traject non trouvé';
      } else if (error.status === 403) {
        errorMessage = 'Vous n\'avez pas les permissions nécessaires';
      } else if (error.status === 409) {
        errorMessage = 'Ce traject est utilisé dans des voyages, suppression impossible';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.error?.errors?.[0]?.message) {
        errorMessage = error.error.errors[0].message;
      }
      
      Swal.fire('Erreur', errorMessage, 'error');
    }
  });
}
// Add this method to handle predefined traject selection:
private loadLocations(): void {
  this.loadingLocations = true;
  this.http.getLocations().subscribe({
    next: (response: any) => {
      // Extract the locations array from the response
      const locations = response.data || response.locations || response;
      
      // Ensure it's an array
      if (Array.isArray(locations)) {
        this.locations = locations;
        this.activeLocations = locations.filter(loc => loc.isActive);
      } else {
        console.error('Locations response is not an array:', locations);
        this.locations = [];
        this.activeLocations = [];
        this.snackBar.open('Format de données invalide pour les lieux', 'Fermer', { duration: 3000 });
      }
      
      this.loadingLocations = false;
    },
    error: (error) => {
      console.error('Error loading locations:', error);
      this.snackBar.open('Erreur lors du chargement des lieux', 'Fermer', { duration: 3000 });
      this.loadingLocations = false;
      this.locations = [];
      this.activeLocations = [];
    }
  });
}
getSelectedStartLocationInfo(): string {
  // First check if we have a selected traject with startLocationId
  if (this.selectedTraject?.startLocationId) {
    const location = this.locations.find(l => l.id === this.selectedTraject!.startLocationId);
    return location ? location.name : 'Lieu inconnu';
  }
  
  // Fallback to trip form (for backward compatibility or new mode)
  const locationId = this.tripForm.get('startLocationId')?.value;
  if (!locationId) return 'Non sélectionné';
  
  const location = this.locations.find(l => l.id === locationId);
  return location ? location.name : 'Lieu inconnu';
}

getSelectedEndLocationInfo(): string {
  // First check if we have a selected traject with endLocationId
  if (this.selectedTraject?.endLocationId) {
    const location = this.locations.find(l => l.id === this.selectedTraject!.endLocationId);
    return location ? location.name : 'Lieu inconnu';
  }
  
  // Fallback to trip form
  const locationId = this.tripForm.get('endLocationId')?.value;
  if (!locationId) return 'Non sélectionné';
  
  const location = this.locations.find(l => l.id === locationId);
  return location ? location.name : 'Lieu inconnu';
}

// Add method to get start location ID from either traject or form
getStartLocationId(): number | null {
  if (this.selectedTraject?.startLocationId) {
    return this.selectedTraject.startLocationId;
  }
  return this.tripForm.get('startLocationId')?.value || null;
}

// Add method to get end location ID from either traject or form
getEndLocationId(): number | null {
  if (this.selectedTraject?.endLocationId) {
    return this.selectedTraject.endLocationId;
  }
  return this.tripForm.get('endLocationId')?.value || null;
}

// Add custom validator
private differentLocationValidator(control: AbstractControl): { [key: string]: any } | null {
  const startLocationId = this.tripForm?.get('startLocationId')?.value;
  const endLocationId = control.value;
  
  if (startLocationId && endLocationId && startLocationId === endLocationId) {
    return { sameLocation: true };
  }
  return null;
}
// Update the onTrajectSelected method to provide better feedback
onTrajectSelected(trajectId: number): void {
  const traject = this.trajects.find(t => t.id === trajectId);
  if (!traject) {
    this.selectedTraject = null;
    return;
  }

  this.selectedTraject = { ...traject };
  
  // Clear existing deliveries
  this.deliveries.clear();
  
  // Create a delivery for each point in the traject
  traject.points.forEach((point, index) => {
    this.addDelivery({
      deliveryAddress: point.location || `Point ${index + 1}`,
      sequence: index + 1,
      customerId: point.clientId || '',
      notes: point.clientName ? `Client: ${point.clientName}` : '',
      // Preset customer if available
      ...(point.clientId && { customerId: point.clientId })
    });
  });
  
  // Update estimations
  this.updateEstimationsFromTraject(traject);
  
  // If traject has start/end locations, update the form
  if (traject.startLocationId) {
    this.tripForm.get('startLocationId')?.setValue(traject.startLocationId);
  }
  
  if (traject.endLocationId) {
    this.tripForm.get('endLocationId')?.setValue(traject.endLocationId);
  }
  
  this.snackBar.open(`Traject "${traject.name}" chargé avec ${traject.points.length} points`, 'Fermer', { duration: 3000 });
  this.showDeliveriesSection = true;
}

// New method to handle location selection
private tryToAutoSelectLocations(traject: ITraject): void {
  if (!traject || !traject.points || traject.points.length === 0) {
    return;
  }

  // Get unique clients from traject points
  const uniqueClients = this.getUniqueClientsFromTraject(traject);
  
  if (uniqueClients.length >= 2) {
    // If we have at least 2 different clients, use them for start and end
    this.selectLocationsFromDifferentClients(uniqueClients);
  } else if (uniqueClients.length === 1) {
    // Only one client in the traject
    this.selectLocationsForSingleClient(uniqueClients[0], traject);
  } else {
    // No clients in traject, use first available locations
    this.selectDefaultLocations();
  }
}

// Get unique clients from traject
private getUniqueClientsFromTraject(traject: ITraject): any[] {
  const uniqueClients = [];
  const seenClientIds = new Set();
  
  if (!traject.points) return [];
  
  for (const point of traject.points) {
    if (point.clientId && !seenClientIds.has(point.clientId)) {
      seenClientIds.add(point.clientId);
      uniqueClients.push({
        clientId: point.clientId,
        clientName: point.clientName,
        location: point.location
      });
    }
  }
  
  return uniqueClients;
}

// Select locations when traject has different clients
private selectLocationsFromDifferentClients(uniqueClients: any[]): void {
  // Use first client for start
  const firstClient = uniqueClients[0];
  const startLocationId = this.findLocationForClient(firstClient.clientId);
  
  // Use last client for end
  const lastClient = uniqueClients[uniqueClients.length - 1];
  const endLocationId = this.findLocationForClient(lastClient.clientId);
  
  if (startLocationId) {
    this.tripForm.get('startLocationId')?.setValue(startLocationId);
  }
  
  if (endLocationId && endLocationId !== startLocationId) {
    this.tripForm.get('endLocationId')?.setValue(endLocationId);
  } else if (startLocationId && uniqueClients.length > 1) {
    // If end is same as start but we have multiple clients, find alternative
    const alternativeLocationId = this.findAlternativeLocation(startLocationId);
    if (alternativeLocationId) {
      this.tripForm.get('endLocationId')?.setValue(alternativeLocationId);
    }
  }
}

// Select locations when traject has only one client
private selectLocationsForSingleClient(client: any, traject: ITraject): void {
  // Try to find location for this client
  const clientLocationId = this.findLocationForClient(client.clientId);
  
  if (clientLocationId) {
    // For single client, we need two different locations
    // Use client location for start
    this.tripForm.get('startLocationId')?.setValue(clientLocationId);
    
    // Find a different location for end
    const alternativeLocationId = this.findAlternativeLocation(clientLocationId);
    if (alternativeLocationId) {
      this.tripForm.get('endLocationId')?.setValue(alternativeLocationId);
    } else {
      // If no alternative, show message
      this.snackBar.open(
        'Ce traject contient un seul client. Veuillez choisir un lieu d\'arrivée différent.',
        'Fermer',
        { duration: 4000 }
      );
    }
  } else {
    // Can't find location for client, use defaults
    this.selectDefaultLocations();
  }
}

// Find location based on client ID
private findLocationForClient(clientId: number): number | null {
  const customer = this.customers.find(c => c.id === clientId);
  if (!customer) return null;
  
  // Try to find location by customer name
  const location = this.locations.find(loc => 
    loc.name.toLowerCase().includes(customer.name.toLowerCase()) ||
    (customer.name && customer.name.toLowerCase().includes(loc.name.toLowerCase()))
  );
  
  return location?.id || null;
}

// Find alternative location different from given one
private findAlternativeLocation(excludeLocationId: number): number | null {
  const alternative = this.activeLocations.find(loc => loc.id !== excludeLocationId);
  return alternative?.id || null;
}

// Select default locations (first and second available)
private selectDefaultLocations(): void {
  if (this.activeLocations.length >= 2) {
    this.tripForm.get('startLocationId')?.setValue(this.activeLocations[0].id);
    this.tripForm.get('endLocationId')?.setValue(this.activeLocations[1].id);
  } else if (this.activeLocations.length === 1) {
    this.tripForm.get('startLocationId')?.setValue(this.activeLocations[0].id);
    this.snackBar.open(
      'Un seul lieu disponible. Veuillez choisir un lieu d\'arrivée différent.',
      'Fermer',
      { duration: 4000 }
    );
  }
}

// Add this new method to suggest locations
private suggestLocationsFromTraject(traject: ITraject): void {
  if (!traject || !traject.points || traject.points.length === 0) return;
  
  const firstPoint = traject.points[0];
  const lastPoint = traject.points[traject.points.length - 1];
  
  // Show suggestions in snackbar
  let suggestionMessage = 'Conseil: ';
  
  if (firstPoint.clientName) {
    suggestionMessage += `Vous pourriez choisir "${firstPoint.clientName}" comme lieu de départ`;
  }
  
  if (lastPoint.clientName && lastPoint.clientName !== firstPoint.clientName) {
    suggestionMessage += ` et "${lastPoint.clientName}" comme lieu d'arrivée`;
  } else if (lastPoint.clientName) {
    suggestionMessage += ` comme lieu de départ et d'arrivée`;
  }
  
  if (suggestionMessage !== 'Conseil: ') {
    this.snackBar.open(suggestionMessage, 'Fermer', { duration: 5000 });
  }
}
// Dans trip-form.component.ts

// Calculer le poids total des livraisons
calculateTotalWeight(): number {
  return this.deliveryControls.reduce((total, deliveryGroup) => {
    const orderId = deliveryGroup.get('orderId')?.value;
    if (orderId) {
      const order = this.allOrders.find(o => o.id === orderId);
      return total + (order?.weight || 0);
    }
    return total;
  }, 0);
}

// Calculer le pourcentage de capacité
calculateCapacityPercentage(): number {
  const truckId = this.tripForm.get('truckId')?.value;
  if (!truckId) return 0;
  
  const truck = this.trucks.find(t => t.id === truckId);
  if (!truck || !truck.capacity) return 0;
  
  const totalWeight = this.calculateTotalWeight();
  return Math.min(100, (totalWeight / truck.capacity) * 100);
}

// Obtenir le message d'alerte
getCapacityAlert(): { message: string, color: string, icon: string } {
  const percentage = this.calculateCapacityPercentage();
  
  if (percentage >= 100) {
    return {
      message: 'Capacité dépassée !',
      color: '#ef4444', // Rouge
      icon: 'error'
    };
  } else if (percentage >= 90) {
    return {
      message: 'Capacité presque pleine',
      color: '#f59e0b', // Orange
      icon: 'warning'
    };
  } else if (percentage >= 70) {
    return {
      message: 'Capacité élevée',
      color: '#3b82f6', // Bleu
      icon: 'info'
    };
  } else {
    return {
      message: 'Capacité normale',
      color: '#10b981', // Vert
      icon: 'check_circle'
    };
  }
}
// Dans trip-form.component.ts

// Obtenir la capacité du camion sélectionné
getSelectedTruckCapacity(): number {
  const truckId = this.tripForm.get('truckId')?.value;
  if (!truckId) return 0;
  
  const truck = this.trucks.find(t => t.id === truckId);
  return truck?.capacity || 0;
}

// Obtenir la couleur de la barre de progression
getProgressBarColor(): string {
  const percentage = this.calculateCapacityPercentage();
  
  if (percentage >= 100) {
    return '#ef4444'; // Rouge
  } else if (percentage >= 90) {
    return '#f59e0b'; // Orange
  } else if (percentage >= 70) {
    return '#3b82f6'; // Bleu
  } else {
    return '#10b981'; // Vert
  }
}

// Calculer le pourcentage pour chaque livraison
calculateDeliveryPercentage(index: number): number {
  const truckId = this.tripForm.get('truckId')?.value;
  if (!truckId) return 0;
  
  const truck = this.trucks.find(t => t.id === truckId);
  if (!truck?.capacity) return 0;
  
  const deliveryGroup = this.deliveryControls[index];
  const orderId = deliveryGroup.get('orderId')?.value;
  if (!orderId) return 0;
  
  const order = this.allOrders.find(o => o.id === orderId);
  const weight = order?.weight || 0;
  
  return (weight / truck.capacity) * 100;
}

// Valider la capacité avant soumission
validateCapacity(): boolean {
  const percentage = this.calculateCapacityPercentage();
  
  if (percentage > 100) {
    this.snackBar.open(
      `Capacité dépassée de ${(percentage - 100).toFixed(0)}% ! Veuillez réduire le chargement.`,
      'Fermer',
      { duration: 5000, panelClass: ['error-snackbar'] }
    );
    return false;
  } else if (percentage >= 90) {
    // Avertissement mais pas de blocage
    this.snackBar.open(
      'Attention : La capacité est presque pleine (' + percentage.toFixed(0) + '%)',
      'Fermer',
      { duration: 3000, panelClass: ['warning-snackbar'] }
    );
    return true;
  }
  
  return true;
}
private loadConvoyeurs(): void {
  this.loadingConvoyeurs = true;
  // Adaptez cette méthode selon votre API
  this.http.getConvoyeurs().subscribe({
    next: (convoyeurs) => {
      this.convoyeurs = convoyeurs;
      this.loadingConvoyeurs = false;
    },
    error: (error) => {
      console.error('Error loading convoyeurs:', error);
      this.snackBar.open('Erreur lors du chargement des convoyeurs', 'Fermer', { duration: 3000 });
      this.loadingConvoyeurs = false;
    }
  });
}
}