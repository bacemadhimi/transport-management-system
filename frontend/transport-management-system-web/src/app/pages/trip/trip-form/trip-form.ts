import { Component, HostListener, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CreateDeliveryDto, CreateTripDto, DeliveryStatusOptions, TripStatus, UpdateTripDto } from '../../../types/trip';
import { ITruck } from '../../../types/truck';
import { IDriver } from '../../../types/driver';
import { ICustomer } from '../../../types/customer';
import { IOrder, OrderStatus } from '../../../types/order';
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
import { debounceTime, forkJoin, map, Subscription } from 'rxjs';
import { ITraject, ITrajectPoint } from '../../../types/traject';
import { TrajectFormSimpleComponent } from './traject-form-simple.component';
import { CdkDragDrop, CdkDrag, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { animate, style, transition, trigger } from '@angular/animations';
import Swal from 'sweetalert2';
import { ILocation } from '../../../types/location';
import { IConvoyeur } from '../../../types/convoyeur';
import { MatChipsModule } from '@angular/material/chips';
import { WeatherData } from '../../../types/weather';


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
    CdkDropList,
    MatChipsModule
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
  availableDrivers: IDriver[] = [];
  unavailableDrivers: any[] = [];
  loadingAvailableDrivers = false;
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
  trajects: ITraject[] = [];
  selectedTraject: ITraject | null = null;
  selectedTrajectControl = new FormControl<number | null>(null);
  trajectMode: 'predefined' | 'new' | null = null;
  saveAsPredefined = false; 
  trajectName = '';
  loadingTrajects = false;
  hasMadeTrajectChoice = false;
  isEditingTrajectName = false;
  editingTrajectName = '';
  isEditingPoint: number | null = null;
  editingPointAddress = '';
  savingTrajectChanges = false;
  hasUnsavedTrajectChanges = false;
  debounceTimer: any;
  clientsToShowCount = 6; 
  showAllClients = false;
  maxInitialClients = 6; 
  
  saveAsTrajectControl = new FormControl(false);
  predefinedTrajectCheckbox = new FormControl(false);
  weatherLoading = false;
  startLocationWeather: WeatherData | null = null;
  endLocationWeather: WeatherData | null = null;
  weatherError = false;
  showWeatherForecast = false;
  startLocationForecast: any[] = [];
  endLocationForecast: any[] = [];
  isEditMode = false; 
  today = new Date();
  
 tripStatuses = [
  { value: 'Planned', label: 'Planifié' },
  { value: 'Accepted', label: 'Accepté' },
  { value: 'LoadingInProgress', label: 'Chargement en cours' },
  { value: 'DeliveryInProgress', label: 'Livraison en cours' },
  { value: 'Receipt', label: 'Réception' },
  { value: 'Cancelled', label: 'Annulé' }
];
  
  deliveryStatuses = DeliveryStatusOptions;
  public Math = Math; 
  
  loading = false;
  loadingTrucks = false;
  loadingDrivers = false;
  loadingCustomers = false;
  loadingOrders = false;
  displayMode: 'grid' | 'list' = 'grid';
  deletingTraject = false;
  locations: ILocation[] = [];
  activeLocations: ILocation[] = [];
  loadingLocations = false;
  showDeliveriesSection = false;
  arrivalEqualsDeparture = new FormControl(false);
  arrivalEqualsDepartureChangeSub: Subscription | undefined;
  currentQuickAddStep: 1 | 2 | 3 = 1;
  selectedClient: ICustomer | null = null;
  selectedOrders: number[] = [];
  clientSearchControl = new FormControl('');
  filteredClients: ICustomer[] = [];
  allClientsWithPendingOrders: ICustomer[] = [];
  lastAddedOrdersCount = 0;
  showSaveAsPredefinedOption = false;
  submitted = false;

  

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
    

    if (!this.data.tripId) {
      this.trajectMode = 'new'; 
      this.hasMadeTrajectChoice = true;
    }
    
    this.tripForm.get('startLocationId')?.valueChanges.subscribe(() => {
      this.checkForSimilarTrajects();
    });
    
    this.tripForm.get('endLocationId')?.valueChanges.subscribe(() => {
      this.checkForSimilarTrajects();
    });
    
    this.deliveries.valueChanges.subscribe(() => {
      this.checkForSimilarTrajects();
    });
    
    this.loadAllDrivers().then(() => {
      this.tripForm.get('estimatedStartDate')?.valueChanges.subscribe((date: Date | null) => {
        if (date) {
          this.loadAvailableDrivers(date);
        } else {
          this.availableDrivers = [...this.drivers];
          this.unavailableDrivers = [];
        }
      });
    });
    
    this.tripForm.get('driverId')?.valueChanges.subscribe((driverId: number | null) => {
      if (driverId) {
        this.checkSelectedDriverAvailability();
      }
    });
    
    this.arrivalEqualsDepartureChangeSub = this.arrivalEqualsDeparture.valueChanges.subscribe(
      (checked: boolean | null) => {
        this.onArrivalEqualsDepartureChange(checked ?? false);
      }
    );
    
    if (this.data.tripId) {
      this.isEditMode = true;
       this.loadTrip(this.data.tripId).then(() => {
        setTimeout(() => {
        
      this.refreshDriversByDateAndZone();
    }, 300) });
    } else {
      this.isEditMode = false; 
      this.loadTrajects();
    }
    
    this.searchControl.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.applySearchFilter();
      });
    

    this.clientSearchControl.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.applyClientSearchFilter();
      });

      this.tripForm.get('startLocationId')?.valueChanges.subscribe(locationId => {
      if (locationId) {
        this.fetchWeatherForStartLocation();
      }
    });
    
    this.tripForm.get('endLocationId')?.valueChanges.subscribe(locationId => {
      if (locationId) {
        this.fetchWeatherForEndLocation();
      }
    });
    
    
    this.tripForm.get('estimatedStartDate')?.valueChanges.subscribe(() => {
      if (this.tripForm.get('estimatedStartDate')?.value) {
        this.fetchWeatherForecast();
      }
    });

  }

  private formatDateForAPI(date: Date): string {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  private initForm(): void {
    this.tripForm = this.fb.group({
      estimatedStartDate: [null, Validators.required],
      estimatedEndDate: [null, [Validators.required, this.dateSequenceValidator.bind(this)]],
      truckId: ['', Validators.required],
      driverId: ['', Validators.required],
      estimatedDistance: ['', [Validators.required, Validators.min(0.1)]],
      estimatedDuration: ['', [Validators.required, Validators.min(0.1)]],
      tripStatus: [{ value: TripStatus.Planned, disabled: true }],
      deliveries: this.deliveries,
      startLocationId: [null, Validators.required],
      endLocationId: [null, Validators.required],
      convoyeurId: [null], 
      trajectId: [null]
    });
    const startDateControl = this.tripForm.get('estimatedStartDate');
    const endDateControl = this.tripForm.get('estimatedEndDate');
  
  if (startDateControl && endDateControl) {
    startDateControl.valueChanges.subscribe(() => {
      endDateControl.updateValueAndValidity();
    });
  }
  }

  private loadData(): void {
    this.loadTrucks();
    this.loadAllDrivers();
    this.loadConvoyeurs();
    this.loadCustomers();
    this.loadAvailableOrders();
  }

  private loadTrajects(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingTrajects = true;
      this.http.getAllTrajects().subscribe({
        next: (trajects: ITraject[]) => {
          this.trajects = trajects
            .filter(t => t.isPredefined)
            .sort((a, b) => a.name.localeCompare(b.name));
          this.loadingTrajects = false;
          resolve();
        },
        error: (error) => {
          console.error('Error loading trajects:', error);
          this.loadingTrajects = false;
          this.snackBar.open('Erreur lors du chargement des trajects prédéfinis', 'Fermer', { duration: 3000 });
          reject(error);
        }
      });
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

loadAvailableDrivers(date: Date | null): void {
  if (!date) {
    const zoneId = this.getStartLocationZoneId();
    if (zoneId) {
      this.loadDriversByZone(zoneId);
    } else {
      this.availableDrivers = [...this.drivers];
      this.unavailableDrivers = [];
    }
    return;
  }
  
  if (this.drivers.length === 0) {
    console.log('Waiting for drivers to load...');
    setTimeout(() => {
      this.loadAvailableDrivers(date);
    }, 500);
    return;
  }
  
  const zoneId = this.getStartLocationZoneId();
 
  this.loadAvailableDriversByDateAndZone(date, zoneId);
}
 
  checkSelectedDriverAvailability(): void {
    const driverId = this.tripForm.get('driverId')?.value;
    const startDate = this.tripForm.get('estimatedStartDate')?.value;
    
    if (!driverId || !startDate) {
      return;
    }
    
    const dateStr = this.formatDateForAPI(startDate);
    const excludeTripId = this.data.tripId || undefined;
    
    this.http.checkDriverAvailabilityList(driverId, dateStr, excludeTripId).subscribe({
      next: (response: any) => {
        if (!response.isAvailable && !this.data.tripId) {
          this.snackBar.open(
            `⚠️ ${response.driverName}: ${response.reason}`,
            'Fermer',
            { duration: 5000 }
          );
        }
      },
      error: (error) => {
        console.error('Error checking driver availability:', error);
      }
    });
  }

  private loadCustomers(): void {
    this.loadingCustomers = true;
    
    this.http.getCustomersWithReadyToLoadOrders().subscribe({
      next: (customers) => {
        this.customers = customers;
        this.allClientsWithPendingOrders = customers;
        this.filteredClients = [...this.allClientsWithPendingOrders];
        this.loadingCustomers = false;
        
        console.log(`Loaded ${customers.length} customers with ReadyToLoad orders`);
      },
      error: (error) => {
        console.error('Error loading customers with ready orders:', error);
        this.loadingCustomers = false;
        this.snackBar.open('Erreur lors du chargement des clients', 'Fermer', { duration: 3000 });
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
          order.status?.toLowerCase() === OrderStatus.ReadyToLoad?.toLowerCase()
        );
        
        this.filteredOrders = [...this.ordersForQuickAdd];
        
        this.loadClientsWithPendingOrders();
        
        this.loadingOrders = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loadingOrders = false;
        this.snackBar.open('Erreur lors du chargement des commandes', 'Fermer', { duration: 3000 });
      }
    });
  }

  private loadClientsWithPendingOrders(): void {
    const clientIdsWithPendingOrders = new Set<number>();
    
    this.ordersForQuickAdd.forEach(order => {
      if (order.customerId) {
        clientIdsWithPendingOrders.add(order.customerId);
      }
    });
    
    this.allClientsWithPendingOrders = this.customers.filter(customer => 
      clientIdsWithPendingOrders.has(customer.id)
    );
    
    this.filteredClients = [...this.allClientsWithPendingOrders];
  }

  private loadTrip(tripId: number): Promise<void> {
    return new Promise((resolve, reject) => {
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
        const trajectId = trip.trajectId || null;
      
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
          trajectId: trajectId
        }, { emitEvent: false });
 
        this.deliveries.clear();
        
     
        if (trip.deliveries && trip.deliveries.length > 0) {
        
          this.trajectMode = 'new';
          this.hasMadeTrajectChoice = true;
          this.loadDeliveriesFromTrip(trip.deliveries || []);
          if (trajectId) 
          this.checkAndDisplayTrajectStatus(trajectId);
        } else {
        
          this.trajectMode = 'new';
          this.hasMadeTrajectChoice = true;
        }
        
        this.loading = false;
        resolve();
      },
      error: (error) => {
        console.error('Error loading trip:', error);
        this.snackBar.open('Erreur lors du chargement du voyage', 'Fermer', { duration: 3000 });
        this.loading = false;
        reject(error);
      }
    });
  });
  }

  private async checkAndDisplayTrajectStatus(trajectId: number): Promise<void> {
    try {
      
      this.http.getTrajectById(trajectId).subscribe({
        next: (traject: ITraject) => {
          if (traject) {
           
            this.selectedTraject = traject;
            this.selectedTrajectControl.setValue(traject.id, { emitEvent: false });
            
          
            this.trajectMode = 'predefined';
            this.hasMadeTrajectChoice = true;
            
          
            if (traject.startLocationId) {
              this.tripForm.get('startLocationId')?.setValue(traject.startLocationId);
            }
            if (traject.endLocationId) {
              this.tripForm.get('endLocationId')?.setValue(traject.endLocationId);
            }
            
            if (!traject.isPredefined) {
              this.saveAsPredefined = false;
              this.showSaveAsPredefinedOption = true;
            } else {
              this.saveAsPredefined = true;
              this.showSaveAsPredefinedOption = false;
            }
          } else {

            this.trajectMode = 'new';
            this.hasMadeTrajectChoice = true;
          }
        },
        error: (error) => {
          console.error('Error loading traject:', error);      
          this.trajectMode = 'new';
          this.hasMadeTrajectChoice = true;
        }
      });
    } catch (error) {
      console.error('Error checking traject:', error);
    }
  }

  private loadDeliveriesFromTrip(deliveries: any[]): void {
    if (deliveries.length === 0) {
      this.showDeliveriesSection = false;
      return;
    }
  
    const sortedDeliveries = [...deliveries].sort((a, b) => 
      (a.sequence || 0) - (b.sequence || 0)
    );
    
    sortedDeliveries.forEach(delivery => {
      const deliveryData = {
        customerId: delivery.customerId || '',
        orderId: delivery.orderId || '', 
        deliveryAddress: delivery.deliveryAddress || '',
        sequence: delivery.sequence || 0,
        plannedTime: delivery.plannedTime,
        notes: delivery.notes || ''
      };
      
      this.addDelivery(deliveryData);
    });
    
    this.showDeliveriesSection = true;
  }

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
    }
    
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

  clearTrajectSelection(): void {
    if (this.selectedTraject && this.hasDeliveryData()) {
      const confirmed = confirm('Changer de traject effacera les livraisons que vous avez ajoutées. Voulez-vous continuer ?');
      if (!confirmed) {
        this.selectedTrajectControl.setValue(this.selectedTraject?.id || null);
        return;
      }
    }
    
    this.selectedTraject = null;
    this.selectedTrajectControl.setValue(null);
    this.deliveries.clear();
    this.showSaveAsPredefinedOption = false;
  }

  formatTrajectDate(dateString: string): string {
    return this.datePipe.transform(dateString, 'dd/MM/yyyy') || '';
  }

  calculateTrajectDistance(): number {
    if (!this.selectedTraject || !this.selectedTraject.points) {
      return 0;
    }
    
    const distance = this.selectedTraject.points.length * 15;
    return Math.round(distance);
  }

  onSaveAsPredefinedChange(checked: boolean): void {
    this.saveAsPredefined = checked;
    
    if (this.data.tripId && this.selectedTraject && checked) {
      
      Swal.fire({
        title: 'Enregistrer comme traject standard',
        text: 'Voulez-vous enregistrer ce traject comme standard pour pouvoir le réutiliser dans d\'autres voyages ?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, enregistrer',
        cancelButtonText: 'Non',
        confirmButtonColor: '#3b82f6'
      }).then((result) => {
        if (result.isConfirmed) {
          
          this.saveTrajectAsPredefined();
        } else {
          
          this.saveAsPredefined = false;
        }
      });
    }
    
    
    if (checked && this.trajectMode === 'new' && (!this.trajectName || this.trajectName.trim() === '')) {
      const startLocationName = this.getSelectedStartLocationInfo();
      const endLocationName = this.getSelectedEndLocationInfo();
      
      if (startLocationName !== 'Non sélectionné' && 
          endLocationName !== 'Non sélectionné' &&
          startLocationName !== 'Lieu inconnu' && 
          endLocationName !== 'Lieu inconnu') {
        
        this.trajectName = `${startLocationName} - ${endLocationName}`;
        
      } else if (this.deliveries.length > 0) {
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

  async saveTrajectAsPredefined(): Promise<void> {
    if (!this.selectedTraject) return;

    this.savingTrajectChanges = true;
    
    const trajectData: any = {
      name: this.selectedTraject.name,
      points: this.selectedTraject.points.map(point => ({
        location: point.location,
        order: point.order,
        clientId: point.clientId
      })),
      startLocationId: this.tripForm.get('startLocationId')?.value,
      endLocationId: this.tripForm.get('endLocationId')?.value,
      isPredefined: true 
    };
    
    this.http.updateTraject(this.selectedTraject.id, trajectData).subscribe({
      next: (result) => {
        this.savingTrajectChanges = false;
        this.selectedTraject = result;
        this.saveAsPredefined = true;
        this.showSaveAsPredefinedOption = false;
        
        const index = this.trajects.findIndex(t => t.id === result.id);
        if (index !== -1) {
          this.trajects[index] = result;
        }
        
        this.snackBar.open('Traject enregistré comme standard avec succès', 'Fermer', { duration: 3000 });
      },
      error: (error) => {
        this.savingTrajectChanges = false;
        console.error('Error updating traject:', error);
        this.snackBar.open('Erreur lors de l\'enregistrement du traject', 'Fermer', { duration: 3000 });
      }
    });
  }

  get deliveryControls(): FormGroup[] {
    return this.deliveries.controls as FormGroup[];
  }

  addDelivery(deliveryData?: any): void {
    console.log(deliveryData)
    const sequence = this.deliveries.length + 1;
    let plannedTime = deliveryData?.plannedTime || '';
   
    if (plannedTime && typeof plannedTime === 'string') {
      if (plannedTime.includes('T')) {
       
        const date = new Date(plannedTime);
        if (!isNaN(date.getTime())) {
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          plannedTime = `${hours}:${minutes}`;
        }
      }
     
      else if (plannedTime.length > 5) {
        plannedTime = plannedTime.substring(0, 5);
      }
    }

    const deliveryGroup = this.fb.group({
      customerId: [deliveryData?.customerId || '', Validators.required],
      orderId: [deliveryData?.orderId || '', Validators.required],
      deliveryAddress: [deliveryData?.deliveryAddress || '', [Validators.required, Validators.maxLength(500)]],
      sequence: [deliveryData?.sequence || sequence, [Validators.required, Validators.min(1)]],
      plannedTime: [plannedTime], 
      notes: [deliveryData?.notes || '']
    });

    this.deliveries.push(deliveryGroup);
    this.dropdownFilters.client.push('');
    this.dropdownFilters.order.push('');
    if (!this.showDeliveriesSection) {
      this.showDeliveriesSection = true;
    }
  }

  removeDelivery(index: number): void {
    const removedOrderId = this.deliveryControls[index].get('orderId')?.value;
    
    this.deliveries.removeAt(index);
    this.dropdownFilters.client.splice(index, 1);
    this.dropdownFilters.order.splice(index, 1);
    this.updateDeliverySequences();
    
    if (removedOrderId) {
      const order = this.allOrders.find(o => o.id === removedOrderId);
      if (order && order.status?.toLowerCase() === OrderStatus.ReadyToLoad?.toLowerCase()) {
        if (!this.ordersForQuickAdd.some(o => o.id === removedOrderId)) {
          this.ordersForQuickAdd.push(order);
          this.filteredOrders.push(order);
          this.loadClientsWithPendingOrders();
        }
      }
    }
    
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
    
    if (!customerId) {

      const orderId = deliveryGroup.get('orderId')?.value;
      if (orderId) {
        const order = this.allOrders.find(o => o.id === parseInt(orderId));
        if (order) {
       
          deliveryGroup.get('customerId')?.setValue(order.customerId);
          return [order];
        }
      }
      return [];
    }
    
    return this.allOrders.filter(order => 
      order.customerId === parseInt(customerId) && 
      (order.status?.toLowerCase() === OrderStatus.ReadyToLoad?.toLowerCase())
    );
  }

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

  quickAddOrder(order: IOrder): void {
    const customer = this.customers.find(c => c.id === order.customerId);
    
    const newDelivery = {
      customerId: order.customerId,
      orderId: order.id,
      deliveryAddress: customer?.adress || '',
      sequence: this.deliveries.length + 1,
      notes: `Commande rapide: ${order.reference}`,
    };
    
    this.addDelivery(newDelivery);
    
    this.ordersForQuickAdd = this.ordersForQuickAdd.filter(o => o.id !== order.id);
    this.filteredOrders = this.filteredOrders.filter(o => o.id !== order.id);
    this.loadClientsWithPendingOrders();
    
    this.snackBar.open('Commande ajoutée au trajet', 'Fermer', { duration: 2000 });
  }


  applyClientSearchFilter(): void {
    const searchText = this.clientSearchControl.value?.toLowerCase().trim() || '';
    
    if (!searchText) {
      this.filteredClients = [...this.allClientsWithPendingOrders];
      return;
    }

    this.filteredClients = this.allClientsWithPendingOrders.filter(client => {
      return (
        client.name.toLowerCase().includes(searchText) ||
        client.matricule?.toLowerCase().includes(searchText) ||
        client.adress?.toLowerCase().includes(searchText) ||
        client.email?.toLowerCase().includes(searchText)
      );
    });
  }

  clearClientSearch(): void {
    this.clientSearchControl.setValue('');
    this.filteredClients = [...this.allClientsWithPendingOrders];
  }

  getClientPendingOrdersCount(clientId: number): number {
    return this.ordersForQuickAdd.filter(order => 
      order.customerId === clientId
    ).length;
  }

  getClientTotalWeight(clientId: number): number {
    return this.ordersForQuickAdd
      .filter(order => order.customerId === clientId)
      .reduce((total, order) => total + order.weight, 0);
  }

  async selectClientForQuickAdd(client: ICustomer): Promise<void> {
    this.selectedClient = client;
    
    const clientOrders = this.getClientPendingOrders(client.id);
    const alreadyAddedCount = this.getAlreadyAddedOrdersCount(client.id);
    
    if (alreadyAddedCount > 0) {
      const confirmed = await this.showAlreadyAddedAlert(client.name, alreadyAddedCount, clientOrders.length);
      if (!confirmed) {
        this.selectedClient = null;
        return;
      }
    }
    
    this.currentQuickAddStep = 2;
    this.selectedOrders = [];
    
    this.selectAllOrders();
  }

  getClientPendingOrders(clientId: number): IOrder[] {
    return this.ordersForQuickAdd.filter(order => 
      order.customerId === clientId
    );
  }

  getAlreadyAddedOrdersCount(clientId: number): number {
    return this.deliveryControls.filter(delivery => 
      delivery.get('customerId')?.value === clientId
    ).length;
  }

  private async showAlreadyAddedAlert(
    clientName: string, 
    alreadyAdded: number, 
    totalOrders: number
  ): Promise<boolean> {
    const remaining = totalOrders - alreadyAdded;
    
    return new Promise((resolve) => {
      Swal.fire({
        title: 'Commandes déjà ajoutées',
        html: `
          <div style="text-align: left;">
            <p><strong>${clientName}</strong></p>
            <p>${alreadyAdded} commande(s) de ce client sont déjà dans le voyage.</p>
            <p>Il reste ${remaining} commande(s) en attente.</p>
            <p>Voulez-vous continuer avec les commandes restantes ?</p>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Continuer',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280'
      }).then((result) => {
        resolve(result.isConfirmed);
      });
    });
  }

  goBackToClientSelection(): void {
    this.currentQuickAddStep = 1;
    this.selectedClient = null;
    this.selectedOrders = [];
  }

  toggleOrderSelection(order: IOrder): void {
    const index = this.selectedOrders.indexOf(order.id);
    if (index > -1) {
      this.selectedOrders.splice(index, 1);
    } else {
      this.selectedOrders.push(order.id);
    }
  }

  isOrderSelected(orderId: number): boolean {
    return this.selectedOrders.includes(orderId);
  }

  selectAllOrders(): void {
    this.selectedOrders = this.clientPendingOrders.map(order => order.id);
  }

  deselectAllOrders(): void {
    this.selectedOrders = [];
  }

  get clientPendingOrders(): IOrder[] {
    if (!this.selectedClient) return [];
    return this.getClientPendingOrders(this.selectedClient.id);
  }

  get selectedOrdersCount(): number {
    return this.selectedOrders.length;
  }

  calculateSelectedWeight(): number {
    return this.selectedOrders.reduce((total, orderId) => {
      const order = this.allOrders.find(o => o.id === orderId);
      return total + (order?.weight || 0);
    }, 0);
  }

async confirmAddOrders(): Promise<void> {
  if (this.selectedOrdersCount === 0 || !this.selectedClient) return;

  const totalOrders = this.clientPendingOrders.length;
  const notSelectedCount = totalOrders - this.selectedOrdersCount;

  if (notSelectedCount > 0) {
    const result = await this.showPartialSelectionAlert(
      this.selectedClient.name,
      this.selectedOrdersCount,
      notSelectedCount
    );

    if (result === 'cancel') {
      // User canceled - stay in Step 2
      return;
    } else if (result === 'selectAll') {
      // User selected "Select all" - just select all orders in Step 2
      // DON'T move to Step 3 yet
      this.selectAllOrders();
      return; // Stay in Step 2
    } else if (result === 'continuePartial') {
      // User chose to continue with partial selection
      this.addSelectedOrdersToDeliveries();
      this.currentQuickAddStep = 3;
      this.lastAddedOrdersCount = this.selectedOrdersCount;
    }
  } else {
    // All orders selected, proceed to Step 3
    this.addSelectedOrdersToDeliveries();
    this.currentQuickAddStep = 3;
    this.lastAddedOrdersCount = this.selectedOrdersCount;
  }
}
private async showPartialSelectionAlert(
  clientName: string,
  selectedCount: number,
  notSelectedCount: number
): Promise<'selectAll' | 'continuePartial' | 'cancel'> {
  return new Promise((resolve) => {
    Swal.fire({
      title: 'Sélection partielle',
      html: `
        <div style="text-align: left;">
          <p><strong>${clientName}</strong></p>
          <p>Vous avez sélectionné ${selectedCount} commande(s).</p>
          <p>${notSelectedCount} commande(s) ne seront pas ajoutées.</p>
          <p style="color: #f59e0b;">
            <mat-icon style="vertical-align: middle;">warning</mat-icon>
            Ces commandes resteront en attente de livraison.
          </p>
          <p>Que voulez-vous faire ?</p>
        </div>
      `,
      icon: 'warning',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Sélectionner toutes',
      denyButtonText: 'Continuer avec ces commandes',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#3b82f6',
      denyButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        // User clicked "Select all" - just select all orders
        resolve('selectAll');
      } else if (result.isDenied) {
        // User clicked "Continue with these orders"
        resolve('continuePartial');
      } else {
        // User clicked "Cancel" or dismissed
        resolve('cancel');
      }
    });
  });
}
  private addSelectedOrdersToDeliveries(): void {
    const customer = this.selectedClient;
    if (!customer) return;

    let sequence = this.deliveries.length + 1;

    this.selectedOrders.forEach(orderId => {
      const order = this.allOrders.find(o => o.id === orderId);
      if (!order) return;

      const alreadyExists = this.deliveryControls.some(delivery => 
        delivery.get('orderId')?.value === orderId
      );

      if (!alreadyExists) {
        const newDelivery = {
          customerId: order.customerId,
          orderId: order.id,
          deliveryAddress: customer?.adress || '',
          sequence: sequence++,
          notes: `Commande: ${order.reference}`
        };

        this.addDelivery(newDelivery);
        this.ordersForQuickAdd = this.ordersForQuickAdd.filter(o => o.id !== orderId);
        this.filteredOrders = this.filteredOrders.filter(o => o.id !== orderId);
      }
    });

    this.applyClientSearchFilter();
    this.applySearchFilter();
    
    this.snackBar.open(
      `${this.selectedOrdersCount} commande(s) ajoutée(s) au voyage`,
      'Fermer',
      { duration: 3000 }
    );
  }

  finishQuickAdd(): void {
    this.currentQuickAddStep = 1;
    this.selectedClient = null;
    this.selectedOrders = [];
    
    if (!this.showDeliveriesSection) {
      this.showDeliveriesSection = true;
    }
  }

  previewOrder(order: IOrder): void {
    const customer = this.customers.find(c => c.id === order.customerId);
    
    Swal.fire({
      title: order.reference,
      html: `
        <div style="text-align: left;">
          <div style="margin-bottom: 1rem;">
            <strong>Client:</strong> ${customer?.name || 'N/A'}<br>
            <strong>Type:</strong> ${order.type || 'Standard'}<br>
            <strong>Poids:</strong> ${order.weight} tonne<br>
            <strong>Statut:</strong> ${order.status || 'N/A'}<br>
            
          </div>
          ${order.notes ? `
            <div style="background-color: #f8f9fa; padding: 0.5rem; border-radius: 4px;">
              <strong>Notes:</strong> ${order.notes}
            </div>
          ` : ''}
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Fermer'
    });
  }

  formatOrderDate(dateString: string): string {
    return this.datePipe.transform(dateString, 'dd/MM/yyyy') || '';
  }

  async onSubmit(): Promise<void> {
      this.submitted = true;
    if (this.tripForm.get('endLocationId')?.disabled) {
      this.tripForm.get('endLocationId')?.enable();
    }
    
    if (!this.tripForm.get('startLocationId')?.value || !this.tripForm.get('endLocationId')?.value) {
      Swal.fire({
        icon: 'warning',
        title: 'Attention',
        text: 'Veuillez sélectionner les lieux de départ et d\'arrivée',
        confirmButtonText: 'OK'
      });
      this.tripForm.get('startLocationId')?.markAsTouched();
      this.tripForm.get('endLocationId')?.markAsTouched();
      return;
    }
    
    if (this.tripForm.invalid || this.deliveries.length === 0) {
      this.markFormGroupTouched(this.tripForm);
      this.deliveryControls.forEach(group => this.markFormGroupTouched(group));
      
      if (this.deliveries.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Attention',
          text: 'Ajoutez au moins une livraison',
          confirmButtonText: 'OK'
        });
      }
      return;
    }
    
    if (!this.validateCapacity()) {
      return;
    }
    
   
    if (this.saveAsPredefined && !this.trajectName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Attention',
        text: 'Veuillez saisir un nom pour le traject',
        confirmButtonText: 'OK'
      });
      return;
    }
    
  
    const formValue = this.tripForm.value;
    const deliveries = this.prepareDeliveries(formValue.estimatedStartDate);
    
  
    try {
      const trajectId = await this.handleTrajectCreation();
      if (this.data.tripId) {
        this.updateTrip(formValue, deliveries, trajectId);
      } else {
        this.createTrip(formValue, deliveries, trajectId);
      }
    } catch (error) {
      console.error('Error handling traject:', error);
     
      if (this.data.tripId) {
        this.updateTrip(formValue, deliveries, null);
      } else {
        this.createTrip(formValue, deliveries, null);
      }
    }
      const startDate = this.estimatedStartDateControl?.value;
      const endDate = this.estimatedEndDateControl?.value;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      Swal.fire({
        icon: 'error',
        title: 'Dates invalides',
        text: 'La date de fin doit être après la date de début',
        confirmButtonText: 'OK'
      });
      return;
    }
  }
  }

  private async handleTrajectCreation(): Promise<number | null> {

    if (this.tripForm.get('trajectId')?.value) {
      return this.tripForm.get('trajectId')?.value;
    }
    
    
    if (this.trajectMode === 'predefined' && this.selectedTraject?.id) {
      return this.selectedTraject.id;
    }
    
   
    const trajectName = this.trajectName.trim() || 
      `Trajet ${new Date().toISOString().slice(0, 10)} ${this.getSelectedStartLocationInfo()} → ${this.getSelectedEndLocationInfo()}`;
    
    try {
      const trajectId = await this.createTrajectFromDeliveries(trajectName, this.saveAsPredefined);
      this.tripForm.patchValue({ trajectId: trajectId });
      return trajectId;
    } catch (error) {
      console.error('Failed to create traject:', error);
      return null;
    }
  }

  private createTrajectFromDeliveries(trajectName: string, isPredefined: boolean = false): Promise<number> {
    return new Promise((resolve, reject) => {
      const points = this.deliveryControls.map((group, index) => {
        const address = group.get('deliveryAddress')?.value;
        const customerId = group.get('customerId')?.value;
        const clientName = customerId ? this.getClientName(customerId) : undefined;
        const orderId = group.get('orderId')?.value;
        
        const point: any = {
          location: address || `Point ${index + 1}`,
          order: index + 1
        };
        
        if (customerId) {
          point.clientId = parseInt(customerId);
          point.clientName = clientName;
        }
        
        if (orderId) {
          point.order = parseInt(orderId);
        }
        
        return point;
      });

      const startLocationId = this.tripForm.get('startLocationId')?.value;
      const endLocationId = this.tripForm.get('endLocationId')?.value;

      const trajectData: any = {
        name: trajectName,
        points: points,
        startLocationId: startLocationId,
        endLocationId: endLocationId,
        isPredefined: isPredefined
      };

      this.http.createTraject(trajectData).subscribe({
        next: (traject: ITraject) => {
          resolve(traject.id);
        },
        error: (error) => {
          console.error('Erreur création traject:', error);
          reject(error);
        }
      });
    });
  }

  suggestExistingTraject(): void {
    
    if (!this.saveAsPredefined || this.trajectMode !== 'new') {
      return;
    }
    
    const startLocationId = this.tripForm.get('startLocationId')?.value;
    const endLocationId = this.tripForm.get('endLocationId')?.value;
    
    if (!startLocationId || !endLocationId) {
      return;
    }
    
    this.http.getAllTrajects().subscribe({
      next: (trajects: ITraject[]) => {
        const similarTrajects = trajects.filter(traject => 
          traject.startLocationId === startLocationId && 
          traject.endLocationId === endLocationId
        );
        
        if (similarTrajects.length > 0) {
          Swal.fire({
            title: 'Trajects similaires trouvés',
            html: `
              <div style="text-align: left; max-height: 300px; overflow-y: auto;">
                <p>Des trajects avec les mêmes lieux de départ/arrivée existent déjà :</p>
                <ul style="margin-left: 20px;">
                  ${similarTrajects.map(t => 
                    `<li><strong>${t.name}</strong> (${t.points.length} points)</li>`
                  ).join('')}
                </ul>
                <p style="margin-top: 15px;">
                  Voulez-vous utiliser un de ces trajects existants ?
                </p>
              </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Oui, voir les trajets',
            cancelButtonText: 'Non, créer un nouveau'
          }).then((result) => {
            if (result.isConfirmed) {
              this.trajectMode = 'predefined';
              this.hasMadeTrajectChoice = true;
              this.trajects = similarTrajects.sort((a, b) => a.name.localeCompare(b.name));
              this.snackBar.open(`${similarTrajects.length} trajects similaires disponibles`, 'Fermer', { duration: 3000 });
            }
          });
        }
      },
      error: (error) => {
        console.error('Error finding similar trajects:', error);
      }
    });
  }

  checkForSimilarTrajects(): void {
    if (this.deliveries.length > 0 && 
        this.tripForm.get('startLocationId')?.value && 
        this.tripForm.get('endLocationId')?.value) {
      this.suggestExistingTraject();
    }
  }

  private validateCapacity(): boolean {
    const percentage = Number(this.calculateCapacityPercentage().toFixed(2));
    const totalWeight = this.calculateTotalWeight();
    const capacity = this.getSelectedTruckCapacity();
    
    if (percentage >= 100) {
      const truck = this.trucks.find(t => t.id === this.tripForm.get('truckId')?.value);
      const truckName = truck ? `${truck.immatriculation} - ${truck.brand}` : 'Camion sélectionné';
      const excess = totalWeight - capacity;
      const excessPercentage = percentage - 100;
      
      Swal.fire({
        icon: 'error',
        title: 'DÉPASSEMENT DE CAPACITÉ !',
        html: `
          <div style="text-align: left; padding: 10px;">
            <p><strong>${truckName}</strong></p>
            <p>⚠️ <strong>ALERTE SÉCURITÉ:</strong> Capacité maximale dépassée</p>
            <hr style="margin: 10px 0;">
            <div style="background-color: #fee; padding: 10px; border-radius: 5px; margin: 10px 0;">
              <p><strong>Capacité maximum:</strong> ${capacity} tonne</p>
              <p><strong>Poids total des livraisons:</strong> ${totalWeight.toFixed(2)} tonne</p>
              <p><strong>Dépassement:</strong> <span style="color: #ef4444; font-weight: bold;">
                ${excess.toFixed(2)} tonne (${excessPercentage.toFixed(1)}%)
              </span></p>
            </div>
            <p style="color: #ef4444; font-weight: bold; margin-top: 15px;">
              ❌ IMPOSSIBLE DE CONTINUER
            </p>
            <p>Pour des raisons de sécurité, vous devez réduire le chargement avant de continuer.</p>
          </div>
        `,
        confirmButtonText: 'Compris',
        confirmButtonColor: '#ef4444',
        allowOutsideClick: false,
        showCloseButton: true
      });
      return false;
    } 
    
    if (percentage >= 90) {
      Swal.fire({
        icon: 'warning',
        title: 'Capacité presque pleine',
        html: `
          <div style="text-align: left; padding: 10px;">
            <p>La capacité est presque pleine (<strong>${percentage.toFixed(1)}%</strong>).</p>
            <p>Poids total: ${totalWeight.toFixed(2)} tonne / ${capacity} tonne</p>
            <hr style="margin: 15px 0;">
            <p style="color: #f59e0b;">
              <strong>⚠️ RECOMMANDATION:</strong> Vérifiez que le camion peut supporter cette charge.
            </p>
            <p style="font-weight: bold;">Veuillez réduire le chargement avant de continuer.</p>
          </div>
        `,
        confirmButtonText: 'Réviser le chargement',
        confirmButtonColor: '#f59e0b',
        allowOutsideClick: false,
        showCloseButton: true
      });
      return false; 
    }
    
    return true;
  }

  private proceedWithSubmission(): void {
    const formValue = this.tripForm.value;
    const deliveries = this.prepareDeliveries(formValue.estimatedStartDate);
    
    if (this.data.tripId) {
      this.updateTrip(formValue, deliveries, this.tripForm.get('trajectId')?.value);
    } else {
      this.createTrip(formValue, deliveries, this.tripForm.get('trajectId')?.value);
    }
  }

  getCapacityAlert(): { message: string, color: string, icon: string, showAlert: boolean } {
    const percentage = Number(this.calculateCapacityPercentage().toFixed(2));

    if (percentage >= 100) {
      return {
        message: `Capacité dépassée ! ${percentage.toFixed(1)}%`,
        color: '#ef4444',
        icon: 'error',
        showAlert: true
      };
    } else if (percentage >= 90) {
      return {
        message: `Capacité presque pleine ${percentage.toFixed(1)}%`,
        color: '#f59e0b',
        icon: 'warning',
        showAlert: true
      };
    } else if (percentage >= 70) {
      return {
        message: `Capacité élevée ${percentage.toFixed(1)}%`,
        color: '#3b82f6',
        icon: 'info',
        showAlert: false
      };
    } else {
      return {
        message: `Capacité normale ${percentage.toFixed(1)}%`,
        color: '#10b981',
        icon: 'check_circle',
        showAlert: false
      };
    }
  }

  private createTrip(formValue: any, deliveries: CreateDeliveryDto[], trajectId: number | null): void {
    const createTripData: CreateTripDto = {
      estimatedDistance: parseFloat(formValue.estimatedDistance) || 0,
      estimatedDuration: parseFloat(formValue.estimatedDuration) || 0,
      estimatedStartDate: this.formatDateWithTime(formValue.estimatedStartDate, '08:00:00'),
      estimatedEndDate: this.formatDateWithTime(formValue.estimatedEndDate, '18:00:00'),
      truckId: parseInt(formValue.truckId),
      driverId: parseInt(formValue.driverId),
      deliveries: deliveries,
      trajectId: trajectId,
      convoyeurId: formValue.convoyeurId ? parseInt(formValue.convoyeurId) : null,
    };
    
    this.http.createTrip(createTripData).subscribe({
      next: (response: any) => {
        this.loading = false;
        const tripId = response.id || response.data?.id;
        
        let message = 'Voyage créé avec succès';
        if (trajectId) {
          message += ' et traject enregistré';
        }
        
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: message,
          confirmButtonText: 'OK',
          allowOutsideClick: false,
        }).then(() => this.dialogRef.close(true));
      },
      error: (error) => {
        this.loading = false;
        console.error('Create trip error:', error);
        
        let errorMessage = 'Erreur lors de la création du voyage';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
      }
    });
  }

  private updateTrip(formValue: any, deliveries: CreateDeliveryDto[], trajectId: number | null): void {
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
      trajectId: trajectId
    };
    
    this.loading = true;
    this.http.updateTrip(this.data.tripId!, updateTripData).subscribe({
      next: (response: any) => {
        this.loading = false;
        
        if (response && (response.message || response.Status === 200)) {
          const successMessage = response.message || 'Voyage modifié avec succès';
          
          Swal.fire({
            icon: 'success',
            title: 'Succès',
            text: successMessage,
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            customClass: {
              popup: 'swal2-popup-custom',
              title: 'swal2-title-custom',
              icon: 'swal2-icon-custom',
              confirmButton: 'swal2-confirm-custom'
            }
          }).then(() => this.dialogRef.close(true));
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Succès',
            text: 'Voyage modifié avec succès',
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
      },
      error: (error) => {
        this.loading = false;
        console.error('Update error:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        let errorMessage = 'Erreur lors de la modification du voyage';
        
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.error?.errors) {
          const errors = error.error.errors;
          if (typeof errors === 'object') {
            const errorList = Object.values(errors).flat();
            errorMessage = errorList.join(', ');
          }
        } else if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.status === 404) {
          errorMessage = 'Trajet non trouvé';
        } else if (error?.status === 400) {
          errorMessage = 'Données invalides';
        } else if (error?.status === 403) {
          errorMessage = 'Vous n\'avez pas les permissions nécessaires';
        } else if (error?.status === 409) {
          errorMessage = 'Impossible de modifier un trajet en cours ou terminé';
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
      }
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
      console.error('Invalid baseDate type:', typeof baseDate, baseDate);
      return null;
    }
    
  
    let timeParts;
    if (timeString.includes(':')) {
      timeParts = timeString.split(':');
    } else if (timeString.includes('T')) {
      
      const timeDate = new Date(timeString);
      if (!isNaN(timeDate.getTime())) {
        return timeString;
      }
      return null;
    } else {
      console.error('Invalid time format:', timeString);
      return null;
    }
    
    const hours = timeParts[0] ? parseInt(timeParts[0]) : 0;
    const minutes = timeParts[1] ? parseInt(timeParts[1]) : 0;
    

    dateObj.setHours(hours, minutes, 0, 0);
    
    const result = dateObj.toISOString();
    
    return result;
  }

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

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onCancel(): void {
    this.submitted = false;
    this.dialogRef.close(false);
  }

  formatDateForDisplay(date: any): string {
    return this.datePipe.transform(date, 'dd MMM yyyy') || '';
  }

  getSelectedDriverInfo(): string {
    const driverId = this.tripForm.get('driverId')?.value;
    if (!driverId) return 'Non sélectionné';
    
    const driver = this.drivers.find(d => d.id === driverId);
    return driver ? `${driver.name} (${driver.permisNumber})` : 'Chauffeur inconnu';
  }

  calculateAverageSpeed(): string {
    const distance = this.tripForm.get('estimatedDistance')?.value;
    const duration = this.tripForm.get('estimatedDuration')?.value;
    
    if (!distance || !duration || duration === 0) return '0';
    
    const speed = parseFloat(distance) / parseFloat(duration);
    return speed.toFixed(1);
  }

 getTripStatusLabel(status: string): string {
  switch (status) {
    case TripStatus.Planned:
      return 'Planifié';
    case TripStatus.Accepted:
      return 'Accepté';
    case TripStatus.LoadingInProgress:
      return 'Chargement en cours';
    case TripStatus.DeliveryInProgress:
      return 'Livraison en cours';
    case TripStatus.Receipt:
      return 'Réception';
    case TripStatus.Cancelled:
      return 'Annulé';
    default:
      return 'Planifié';
  }
}

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

  clearSearch(): void {
    this.searchControl.setValue('');
    this.filteredOrders = [...this.ordersForQuickAdd];
  }

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

  isDragDisabled(): boolean {
    return false;
  }

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

  cancelTrajectNameEdit(): void {
    this.isEditingTrajectName = false;
    this.editingTrajectName = '';
  }

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

  cancelPointEdit(): void {
    this.isEditingPoint = null;
    this.editingPointAddress = '';
  }

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

  async deleteTrajectPoint(index: number): Promise<void> {
    if (!this.selectedTraject || this.selectedTraject.points.length <= 1) return;
    
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

  async dropTrajectPoint(event: CdkDragDrop<ITrajectPoint[]>): Promise<void> {
    if (!this.selectedTraject) return;
    
    
    if (event.previousIndex === event.currentIndex) return;
    
    moveItemInArray(this.selectedTraject.points, event.previousIndex, event.currentIndex);
    
    this.updateTrajectPointOrders();
    
    this.hasUnsavedTrajectChanges = true;
    this.debouncedSaveTrajectChanges();
  }

  private updateTrajectPointOrders(): void {
    if (!this.selectedTraject) return;
    
    this.selectedTraject.points.forEach((point, index) => {
      point.order = index + 1;
    });
  }

  togglePredefinedStatus(): void {
    if (!this.selectedTraject) return;
    
    const newStatus = !this.selectedTraject.isPredefined;
    const message = newStatus 
      ? 'Voulez-vous définir ce traject comme standard? Il sera disponible pour tous les utilisateurs.'
      : 'Voulez-vous retirer ce traject de la liste des trajects standards?';
      
    Swal.fire({
      title: 'Changer le statut du traject',
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui',
      cancelButtonText: 'Non'
    }).then((result) => {
      if (result.isConfirmed) {
        this.selectedTraject!.isPredefined = newStatus;
        this.saveTrajectChanges();
      }
    });
  }

  async saveTrajectChanges(): Promise<void> {
    if (!this.selectedTraject) return;
    
    try {
      this.savingTrajectChanges = true;
      
      const trajectData: any = {
        name: this.selectedTraject.name,
        points: this.selectedTraject.points.map(point => ({
          location: point.location,
          order: point.order,
          clientId: point.clientId
        })),
        startLocationId: this.tripForm.get('startLocationId')?.value,
        endLocationId: this.tripForm.get('endLocationId')?.value,
        isPredefined: this.selectedTraject.isPredefined
      };
      
      let result: any;
      if (this.selectedTraject.id) {
        result = await this.http.updateTraject(this.selectedTraject.id, trajectData).toPromise();
      } else {
        result = await this.http.createTraject(trajectData).toPromise();
      }
      
      if (result && result.id) {
        const index = this.trajects.findIndex(t => t.id === result.id);
        if (index !== -1) {
          this.trajects[index] = result;
        } else {
          this.trajects.push(result);
        }
        
        this.trajects = this.trajects
          .filter(t => t && t.name)
          .sort((a, b) => {
            if (!a || !b || !a.name || !b.name) return 0;
            return a.name.localeCompare(b.name);
          });
        
        this.selectedTraject = result;
        
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

getStatusOrder(status: string): number {
  const orderMap: { [key: string]: number } = {
    'Planned': 1,
    'Accepted': 2,
    'Loading': 3,
    'LoadingInProgress': 4,
    'Delivery': 5,
    'DeliveryInProgress': 6,
    'Receipt': 7,
    'Cancelled': 0
  };
  return orderMap[status] || 0;
}

  isStatusCompleted(status: string): boolean {
    const currentStatus = this.tripForm.get('tripStatus')?.value;
    const currentOrder = this.getStatusOrder(currentStatus);
    const targetOrder = this.getStatusOrder(status);
    
    return currentOrder > targetOrder && currentStatus !== 'Cancelled';
  }

canAdvanceStatus(): boolean {
  const currentStatus = this.tripForm.get('tripStatus')?.value;
  
  if (currentStatus === 'Cancelled' || currentStatus === 'Receipt') {
    return false;
  }
  
  switch (currentStatus) {
    case 'Planned':
      const truckId = this.tripForm.get('truckId')?.value;
      const driverId = this.tripForm.get('driverId')?.value;
      const startDate = this.tripForm.get('estimatedStartDate')?.value;
      return !!(truckId && driverId && startDate);
      
    case 'Accepted':
      return true; 
      
    case 'Loading':
      return true;
      
    case 'LoadingInProgress':
      return this.getCompletedDeliveriesCount() === this.deliveries.length;
      
    case 'Delivery':
      return true; 
      
    case 'DeliveryInProgress':
      return this.areAllDeliveriesCompleted();
      
    default:
      return false;
  }
}

advanceStatus(): void {
  if (!this.canAdvanceStatus()) {
    const currentStatus = this.tripForm.get('tripStatus')?.value;
    
    switch (currentStatus) {
      case 'Planned':
        if (!this.tripForm.get('truckId')?.value) {
          this.snackBar.open('Veuillez sélectionner un camion', 'Fermer', { duration: 3000 });
        } else if (!this.tripForm.get('driverId')?.value) {
          this.snackBar.open('Veuillez sélectionner un chauffeur', 'Fermer', { duration: 3000 });
        } else if (!this.tripForm.get('estimatedStartDate')?.value) {
          this.snackBar.open('Veuillez sélectionner une date de début', 'Fermer', { duration: 3000 });
        }
        break;
        
      case 'LoadingInProgress':
        const completed = this.getCompletedDeliveriesCount();
        const total = this.deliveries.length;
        if (completed < total) {
          this.snackBar.open(
            `${total - completed} marchandise(s) ne sont pas complètement chargées`,
            'Fermer', 
            { duration: 3000 }
          );
        }
        break;
        
      case 'DeliveryInProgress':
        if (!this.areAllDeliveriesCompleted()) {
          this.snackBar.open(
            'Toutes les livraisons doivent être complétées avant réception',
            'Fermer',
            { duration: 3000 }
          );
        }
        break;
    }
    return;
  }
  
  const currentStatus = this.tripForm.get('tripStatus')?.value;
  let nextStatus: TripStatus;
  
  switch (currentStatus) {
    case 'Planned':
      nextStatus = TripStatus.Accepted;
      this.showAcceptedConfirmation();
      break;
    case 'Accepted':
      nextStatus = TripStatus.LoadingInProgress;
      this.showLoadingConfirmation(); 
      break;

    case 'LoadingInProgress':
      nextStatus = TripStatus.DeliveryInProgress;
      this.showDeliveryConfirmation();
      break;

    case 'DeliveryInProgress':
      nextStatus = TripStatus.Receipt;
      this.showReceiptConfirmation();
      break;
    default:
      return;
  }
  
  this.tripForm.patchValue({ tripStatus: nextStatus });
  this.updateTripStatusInForm(nextStatus);
  this.updateTripStatusOnBackend(nextStatus);
}
private updateTripStatusOnBackend(status: TripStatus, notes?: string): void {
  if (!this.data.tripId) return;
  
  this.loading = true;
  
  const payload = {
    status: status,
    notes: notes || null
  };
  
  this.http.updateTripStatus(this.data.tripId, payload).subscribe({
    next: (response: any) => {
      this.loading = false;
      
      const statusLabel = this.getTripStatusLabel(status);
      const message = notes 
        ? `Statut mis à jour: ${statusLabel} - Note: ${notes}`
        : `Statut mis à jour: ${statusLabel}`;
      
       this.tripForm.patchValue({ tripStatus: status }, { emitEvent: true });
      
      if (this.data.tripId) {
        this.loadTrip(this.data.tripId);
      }
    },
    error: (error) => {
      this.loading = false;
      console.error('Error updating trip status:', error);
      this.tripForm.patchValue({ tripStatus: this.getPreviousStatus() }, { emitEvent: true });

      let errorMessage = 'Erreur lors de la mise à jour du statut';
      
     
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 400) {
        errorMessage = 'Transition de statut invalide';
      }
      
      this.snackBar.open(errorMessage, 'Fermer', { duration: 4000 });
    }
  });
}
areAllDeliveriesCompleted(): boolean {
  return this.deliveries.length > 0 && 
         this.getCompletedDeliveriesCount() === this.deliveries.length;
}
 
cancelTrip(): void {
  if (!this.data.tripId) {
    this.snackBar.open('Erreur: ID du voyage non trouvé', 'Fermer', { duration: 3000 });
    return;
  }

  Swal.fire({
    title: 'Annuler le voyage ?',
    text: 'Êtes-vous sûr de vouloir annuler ce voyage ? Cette action est irréversible.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Oui, annuler',
    cancelButtonText: 'Non, garder',
    reverseButtons: true,
    backdrop: true,
    allowOutsideClick: false,
    allowEscapeKey: false
  }).then((result) => {
    if (result.isConfirmed) {
      this.updateTripStatusOnBackend(TripStatus.Cancelled, 'Voyage annulé par l\'utilisateur');
    }
  });
}

  private showChargementConfirmation(): void {
    const totalWeight = this.calculateTotalWeight();
    const capacity = this.getSelectedTruckCapacity();
    const percentage = Number(this.calculateCapacityPercentage().toFixed(2));

    
    Swal.fire({
      title: 'Début du chargement',
      html: `
        <div style="text-align: left;">
          <p><strong>Détails du chargement:</strong></p>
          <ul>
            <li>Poids total: <strong>${totalWeight.toFixed(2)} tonne</strong></li>
            <li>Capacité du camion: <strong>${capacity} tonne</strong></li>
            <li>Utilisation: <strong>${percentage.toFixed(1)}%</strong></li>
            <li>Nombre de livraisons: <strong>${this.deliveries.length}</strong></li>
          </ul>
          <p style="color: #f59e0b; margin-top: 1rem;">
            <mat-icon style="vertical-align: middle;">warning</mat-icon>
            Vérifiez que le chargement est correct avant de continuer.
          </p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Commencer le chargement',
      cancelButtonText: 'Revoir'
    });
  }

  private showDeliveryConfirmation(): void {
    const completedDeliveries = this.getCompletedDeliveriesCount();
    const totalDeliveries = this.deliveries.length;
    
    Swal.fire({
      title: 'Début des livraisons',
      html: `
        <div style="text-align: left;">
          <p><strong>Résumé des livraisons:</strong></p>
          <ul>
            <li>Livraisons préparées: <strong>${completedDeliveries}/${totalDeliveries}</strong></li>
            <li>Statut du camion: <strong>Chargé</strong></li>
            <li>Chauffeur: <strong>${this.getSelectedDriverInfo()}</strong></li>
          </ul>
          ${completedDeliveries < totalDeliveries ? 
            `<p style="color: #ef4444; margin-top: 1rem;">
              <mat-icon style="vertical-align: middle;">error</mat-icon>
              Attention: ${totalDeliveries - completedDeliveries} livraisons ne sont pas complètement préparées.
            </p>` : ''}
        </div>
      `,
      icon: completedDeliveries === totalDeliveries ? 'success' : 'warning',
      showCancelButton: true,
      confirmButtonText: 'Commencer les livraisons',
      cancelButtonText: 'Revoir'
    });
  }

  private showReceiptConfirmation(): void {
    const completedDeliveries = this.getCompletedDeliveriesCount();
    const totalDeliveries = this.deliveries.length;
    
    Swal.fire({
      title: 'Générer la réception',
      html: `
        <div style="text-align: left;">
          <p><strong>Résumé final:</strong></p>
          <ul>
            <li>Livraisons complétées: <strong>${completedDeliveries}/${totalDeliveries}</strong></li>
            <li>Distance parcourue: <strong>${this.tripForm.get('estimatedDistance')?.value || 0} km</strong></li>
            <li>Durée totale: <strong>${this.tripForm.get('estimatedDuration')?.value || 0} heures</strong></li>
          </ul>
          <p style="color: #10b981; margin-top: 1rem;">
            <mat-icon style="vertical-align: middle;">check_circle</mat-icon>
            Prêt à générer la réception final.
          </p>
        </div>
      `,
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: 'Générer le bon de réception',
      cancelButtonText: 'Revoir'
    });
  }

  shouldShowTimelineSummary(): boolean {
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
        return 'linear-gradient(135 deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))';
      case 'Adresse incomplète':
        return 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))';
      default:
        return 'linear-gradient(135deg, rgba(148, 163, 184, 0.1), rgba(100, 116, 139, 0.1))';
    }
  }

  resetSequences(): void {
    this.deliveryControls.forEach((group, index) => {
      group.get('sequence')?.setValue(index + 1, { emitEvent: false });
    });
    
    this.snackBar.open('Ordres réinitialisés', 'Fermer', { duration: 2000 });
  }

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

  autoCalculatePlannedTimes(): void {
    this.deliveryControls.forEach((group, index) => {
      const calculatedTime = this.calculateDeliveryTime(index + 1);
      group.get('plannedTime')?.setValue(calculatedTime, { emitEvent: false });
    });
    
    this.snackBar.open('Heures planifiées calculées automatiquement', 'Fermer', { duration: 2000 });
  }

  calculateArrivalTime(): string {
    const startDate = this.tripForm.get('estimatedStartDate')?.value;
    const duration = parseFloat(this.tripForm.get('estimatedDuration')?.value || '0');
    
    if (!startDate || !duration) return 'Non calculable';
    
    const start = new Date(startDate);
    start.setHours(8, 0, 0, 0);
    
    const arrival = new Date(start.getTime() + (duration * 60 * 60 * 1000));
    return this.datePipe.transform(arrival, 'HH:mm') || '';
  }

  getCompletedDeliveriesCount(): number {
    return this.deliveryControls.filter(group => {
      const customerId = group.get('customerId')?.value;
      const orderId = group.get('orderId')?.value;
      const address = group.get('deliveryAddress')?.value;
      return customerId && orderId && address && address.trim().length > 5;
    }).length;
  }

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

  exportTimeline(): void {
    this.snackBar.open('Export du récapitulatif en cours...', 'Fermer', { duration: 2000 });
  }

  printTimeline(): void {
    window.print();
  }

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
    if (this.arrivalEqualsDepartureChangeSub) {
      this.arrivalEqualsDepartureChangeSub.unsubscribe();
    }
    window.removeEventListener('resize', () => {
      this.updateClientsToShowCount();
    });
  }

  changeTraject(): void {
    if (this.selectedTraject && this.hasUnsavedTrajectChanges) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées dans le traject. Voulez-vous vraiment changer sans sauvegarder ?');
      if (!confirmed) {
        return;
      }
    }
    
    //this.clearTrajectSelection();
  }

  hasDeliveryData(): boolean {
    return this.deliveries.length > 0;
  }

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
    
    this.http.deleteTraject(trajectId).subscribe({
      next: () => {
        Swal.fire({
          title: 'Succès',
          text: 'Traject supprimé avec succès',
          icon: 'success',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          this.selectedTraject = null;
          this.selectedTrajectControl.setValue(null);
          this.loadTrajects();
        });
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        
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

  private loadLocations(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.loadingLocations = true;
    this.http.getLocations().subscribe({
      next: (response: any) => {
        const locations = response.data || response.locations || response;
        
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
        resolve();
      },
      error: (error) => {
        console.error('Error loading locations:', error);
        this.snackBar.open('Erreur lors du chargement des lieux', 'Fermer', { duration: 3000 });
        this.loadingLocations = false;
        this.locations = [];
        this.activeLocations = [];
        reject(error);
      }
    });
  });
  }

  getStartLocationId(): number | null {
    if (this.selectedTraject?.startLocationId) {
      return this.selectedTraject.startLocationId;
    }
    return this.tripForm.get('startLocationId')?.value || null;
  }

  getEndLocationId(): number | null {
    if (this.selectedTraject?.endLocationId) {
      return this.selectedTraject.endLocationId;
    }
    return this.tripForm.get('endLocationId')?.value || null;
  }


  onTrajectSelected(trajectId: number): void {
    console.log('Traject sélectionné avec ID:', trajectId);
    const traject = this.trajects.find(t => t.id === trajectId);
    if (!traject) {
      this.selectedTraject = null;
      return;
    }

    this.selectedTraject = { ...traject };
    
    this.deliveries.clear();
    
    traject.points.forEach((point, index) => {
      this.addDelivery({
        deliveryAddress: point.location || `Point ${index + 1}`,
        sequence: index + 1,
        customerId: point.clientId || '',
        orderId: point.order,
        notes: point.clientName ? `Client: ${point.clientName}` : '',
        plannedTime: '',
        ...(point.clientId && { customerId: point.clientId })
      });
    });
    
    this.updateEstimationsFromTraject(traject);
    
    if (traject.startLocationId) {
      this.tripForm.get('startLocationId')?.setValue(traject.startLocationId);
    }
    
    if (traject.endLocationId) {
      this.tripForm.get('endLocationId')?.setValue(traject.endLocationId);
    }
    
    if (traject.startLocationId && traject.endLocationId && 
        traject.startLocationId === traject.endLocationId) {
      this.arrivalEqualsDeparture.setValue(true);
    } else {
      this.arrivalEqualsDeparture.setValue(false);
    }
    
    if (!traject.isPredefined && this.data.tripId) {
      this.showSaveAsPredefinedOption = true;
      this.saveAsPredefined = false;
    } else {
      this.showSaveAsPredefinedOption = false;
      this.saveAsPredefined = traject.isPredefined;
    }
    
    this.showDeliveriesSection = true;
  }

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

  calculateCapacityPercentage(): number {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return 0;
    
    const truck = this.trucks.find(t => t.id === truckId);
    if (!truck || !truck.capacity) return 0;
    
    const totalWeight = this.calculateTotalWeight();
    return Math.min(100, (totalWeight / truck.capacity) * 100);
  }

  getSelectedTruckCapacity(): number {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return 0;
    
    const truck = this.trucks.find(t => t.id === truckId);
    return truck?.capacity || 0;
  }

  getProgressBarColor(): string {
    const percentage = Number(this.calculateCapacityPercentage().toFixed(2));
    if (percentage >= 100) {
      return '#ef4444'; 
    } else if (percentage >= 90) {
      return '#f59e0b'; 
    } else if (percentage >= 70) {
      return '#3b82f6'; 
    } else {
      return '#10b981'; 
    }
  }

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

  private loadConvoyeurs(): void {
    this.loadingConvoyeurs = true;

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

  onArrivalEqualsDepartureChange(checked: boolean | null): void {
    const isChecked = checked ?? false;
    if (isChecked) {
      const startLocationId = this.tripForm.get('startLocationId')?.value;
      if (startLocationId) {
        this.tripForm.get('endLocationId')?.setValue(startLocationId);
        this.tripForm.get('endLocationId')?.clearValidators();
        this.tripForm.get('endLocationId')?.updateValueAndValidity();
      }
    } else {
      this.tripForm.get('endLocationId')?.setValidators(Validators.required);
      this.tripForm.get('endLocationId')?.updateValueAndValidity();
    }
  }

  private loadAllDrivers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingDrivers = true;
      this.http.getDrivers().subscribe({
        next: (drivers) => {
          this.drivers = drivers;
          this.loadingDrivers = false;
          resolve();
          return;
        },
        error: (error) => {
          console.error('Error loading drivers:', error);
          this.snackBar.open('Erreur lors du chargement des chauffeurs', 'Fermer', { duration: 3000 });
          this.loadingDrivers = false;
          reject(error);
        }
      });
    });
  }

  getCurrentDriverName(): string {
    const driverId = this.tripForm.get('driverId')?.value;
    if (!driverId) return '';
    
    const driver = this.drivers.find(d => d.id === driverId);
    return driver?.name || 'Chauffeur actuel';
  }

  getCurrentDriverPermis(): string {
    const driverId = this.tripForm.get('driverId')?.value;
    if (!driverId) return '';
    
    const driver = this.drivers.find(d => d.id === driverId);
    return driver?.permisNumber || '';
  }

  isDriverInList(driverId: number): boolean {
    return this.drivers.some(d => d.id === driverId);
  }

  isCurrentDriverInAvailableList(): boolean {
    const driverId = this.tripForm.get('driverId')?.value;
    if (!driverId) return false;
    
    return this.availableDrivers.some(d => d.id === driverId);
  }

  getDriverNameById(id: number | null): string {
    if (!id) return '';
    const driver = this.availableDrivers.find(d => d.id === id);
    return driver ? driver.name : '';
  }

  get displayedClients(): ICustomer[] {
    if (this.showAllClients) {
      return this.filteredClients;
    }
    return this.filteredClients.slice(0, this.clientsToShowCount);
  }

  get shouldShowMoreButton(): boolean {
    return this.filteredClients.length > this.clientsToShowCount && !this.showAllClients;
  }

  get shouldShowLessButton(): boolean {
    return this.showAllClients && this.filteredClients.length > this.clientsToShowCount;
  }

  showMoreClients(): void {
    this.showAllClients = true;
    
    setTimeout(() => {
      const clientGrid = document.querySelector('.client-grid');
      if (clientGrid) {
        clientGrid.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
  }

  showLessClients(): void {
    this.showAllClients = false;
   
    setTimeout(() => {
      const clientGrid = document.querySelector('.client-grid');
      if (clientGrid) {
        clientGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  toggleClientsDisplay(): void {
    if (this.showAllClients) {
      this.showLessClients();
    } else {
      this.showMoreClients();
    }
  }

  updateClientsToShowCount(): void {
    if (window.innerWidth < 768) {
      this.clientsToShowCount = 3;
    } else if (window.innerWidth < 1024) {
      this.clientsToShowCount = 4;
    } else {
      this.clientsToShowCount = this.maxInitialClients;
    }
    
    if (this.showAllClients && this.filteredClients.length <= this.clientsToShowCount) {
      this.showAllClients = false;
    }
  }

  getSaveButtonTooltip(): string {
    const reasons = [];
    
    if (this.tripForm.invalid) {
      reasons.push('Formulaire invalide');
      
 
      if (this.tripForm.get('estimatedStartDate')?.invalid) reasons.push('Date début requise');
      if (this.tripForm.get('estimatedEndDate')?.invalid) reasons.push('Date fin requise');
      if (this.tripForm.get('truckId')?.invalid) reasons.push('Camion requis');
      if (this.tripForm.get('driverId')?.invalid) reasons.push('Chauffeur requis');
      if (this.tripForm.get('estimatedDistance')?.invalid) reasons.push('Distance invalide');
      if (this.tripForm.get('estimatedDuration')?.invalid) reasons.push('Durée invalide');
      if (this.tripForm.get('startLocationId')?.invalid) reasons.push('Lieu départ requis');
      if (this.tripForm.get('endLocationId')?.invalid) reasons.push('Lieu arrivée requis');
    }
    
    if (this.deliveries.length === 0) {
      reasons.push('Aucune livraison');
    } else if (this.deliveries.invalid) {
      reasons.push('Livraisons invalides');
    }
    
    if (this.loading) {
      reasons.push('Chargement en cours');
    }
    
 
    if (this.saveAsPredefined && !this.trajectName?.trim()) {
      reasons.push('Nom du traject requis');
    }
    
    return reasons.length > 0 ? `Impossible de sauvegarder: ${reasons.join(', ')}` : '';
  }
  
  private showAcceptedConfirmation(): void {
    Swal.fire({
      title: 'Accepter le voyage',
      html: `
        <div style="text-align: left;">
          <p><strong>Confirmation d'acceptation:</strong></p>
          <ul>
            <li>Camion: <strong>${this.getSelectedTruckInfo()}</strong></li>
            <li>Chauffeur: <strong>${this.getSelectedDriverInfo()}</strong></li>
            <li>Date de début: <strong>${this.formatDateForDisplay(this.tripForm.get('estimatedStartDate')?.value)}</strong></li>
          </ul>
          <p>Voulez-vous accepter ce voyage ?</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Accepter',
      cancelButtonText: 'Revoir'
    });
  }

  private showLoadingConfirmation(): void {
    const totalWeight = this.calculateTotalWeight();
    const capacity = this.getSelectedTruckCapacity();
    const percentage = Number(this.calculateCapacityPercentage().toFixed(2));
    
    Swal.fire({
      title: 'Début du chargement',
      html: `
        <div style="text-align: left;">
          <p><strong>Prêt pour le chargement:</strong></p>
          <ul>
            <li>Poids total: <strong>${totalWeight.toFixed(2)} tonne</strong></li>
            <li>Capacité du camion: <strong>${capacity} tonne</strong></li>
            <li>Utilisation: <strong>${percentage.toFixed(1)}%</strong></li>
            <li>Nombre de livraisons: <strong>${this.deliveries.length}</strong></li>
          </ul>
          <p>Démarrer le processus de chargement ?</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Commencer le chargement',
      cancelButtonText: 'Revoir'
    });
  }

  private showLoadingInProgressConfirmation(): void {
    const totalWeight = this.calculateTotalWeight();
    const capacity = this.getSelectedTruckCapacity();
    const percentage = Number(this.calculateCapacityPercentage().toFixed(2));
    
    Swal.fire({
      title: 'Chargement en cours',
      html: `
        <div style="text-align: left;">
          <p><strong>Détails du chargement:</strong></p>
          <ul>
            <li>Poids total: <strong>${totalWeight.toFixed(2)} tonne</strong></li>
            <li>Capacité du camion: <strong>${capacity} tonne</strong></li>
            <li>Utilisation: <strong>${percentage.toFixed(1)}%</strong></li>
            <li>Nombre de livraisons: <strong>${this.deliveries.length}</strong></li>
          </ul>
          <p style="color: #f59e0b; margin-top: 1rem;">
            <mat-icon style="vertical-align: middle;">warning</mat-icon>
            Vérifiez que le chargement est correct avant de continuer.
          </p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Chargement terminé',
      cancelButtonText: 'Revoir'
    });
  }

  private showDeliveryInProgressConfirmation(): void {
    Swal.fire({
      title: 'Livraison en cours',
      html: `
        <div style="text-align: left;">
          <p><strong>Début des livraisons:</strong></p>
          <ul>
            <li>Le camion est en route pour les livraisons</li>
            <li>${this.deliveries.length} point(s) de livraison</li>
            <li>Distance totale: <strong>${this.tripForm.get('estimatedDistance')?.value || 0} km</strong></li>
          </ul>
          <p>Confirmer le début des livraisons ?</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Commencer les livraisons',
      cancelButtonText: 'Revoir'
    });
  }

  private showCompletedConfirmation(): void {
    Swal.fire({
      title: 'Voyage complété',
      html: `
        <div style="text-align: left;">
          <p><strong>Résumé final:</strong></p>
          <ul>
            <li>Livraisons complétées: <strong>${this.getCompletedDeliveriesCount()}/${this.deliveries.length}</strong></li>
            <li>Distance parcourue: <strong>${this.tripForm.get('estimatedDistance')?.value || 0} km</strong></li>
            <li>Durée totale: <strong>${this.tripForm.get('estimatedDuration')?.value || 0} heures</strong></li>
          </ul>
          <p style="color: #10b981; margin-top: 1rem;">
            <mat-icon style="vertical-align: middle;">check_circle</mat-icon>
            Toutes les livraisons sont terminées.
          </p>
        </div>
      `,
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: 'Finaliser le voyage',
      cancelButtonText: 'Revoir'
    });
  }
  
  private getPreviousStatus(): string {
    const current = this.tripForm.get('tripStatus')?.value;
    switch(current) {
      case 'Accepted': return 'Planned';
      case 'LoadingInProgress': return 'Accepted';
      case 'DeliveryInProgress': return 'LoadingInProgress';
      case 'Receipt': return 'DeliveryInProgress';
      default: return 'Planned';
    }
  }
  
  private updateTripStatusInForm(status: TripStatus): void {

    const statusControl = this.tripForm.get('tripStatus');
    if (statusControl?.disabled) {
      statusControl.enable();
    }
    

    this.tripForm.patchValue({ tripStatus: status });
    

    statusControl?.markAsTouched();
    statusControl?.updateValueAndValidity();
    
    
    this.tripForm.updateValueAndValidity();
  }
  
  dropdownFilters: { client: string[], order: string[] } = {
    client: [],
    order: []
  };

  
  initializeDropdownFilters(): void {
    this.dropdownFilters.client = new Array(this.deliveries.length).fill('');
    this.dropdownFilters.order = new Array(this.deliveries.length).fill('');
  }

 
  filterDropdown(type: 'client' | 'order', index: number, event: any): void {
    this.dropdownFilters[type][index] = event.target.value.toLowerCase().trim();
  }

 
  getFilteredCustomers(index: number): ICustomer[] {
    const filterText = this.dropdownFilters.client[index] || '';
    
    if (!filterText) {
      return this.customers;
    }
    
    return this.customers.filter(customer => 
      customer.name.toLowerCase().includes(filterText) ||
      customer.matricule?.toLowerCase().includes(filterText) ||
      customer.email?.toLowerCase().includes(filterText)
    );
  }


  getFilteredOrders(index: number): IOrder[] {
    const customerId = this.deliveryControls[index].get('customerId')?.value;
    
    if (!customerId) {
      return [];
    }
    
    const filterText = this.dropdownFilters.order[index] || '';
    const customerOrders = this.allOrders.filter(order => 
      order.customerId === parseInt(customerId) && 
      (order.status?.toLowerCase() === OrderStatus.ReadyToLoad?.toLowerCase())
    );
    
    if (!filterText) {
      return customerOrders;
    }
    
    return customerOrders.filter(order => 
      order.reference.toLowerCase().includes(filterText) ||
      order.type?.toLowerCase().includes(filterText)
    );
  }
private fetchWeatherForStartLocation(): void {
  const locationId = this.tripForm.get('startLocationId')?.value;
  if (!locationId) return;
  

  const zoneName = this.getZoneNameForLocation(locationId);
  if (!zoneName) {
    console.warn('No zone found for start location');
    this.startLocationWeather = null;
    return;
  }
  
  this.weatherLoading = true;
  this.http.getWeatherByCity(zoneName).subscribe({
    next: (weather) => {
      if (weather) {
      
        const locationInfo = this.getSelectedStartLocationInfo();
        this.startLocationWeather = {
          ...weather,
          location: locationInfo 
        };
      } else {
        this.startLocationWeather = null;
      }
      this.weatherLoading = false;
    },
    error: (error) => {
      console.error('Error fetching weather for start zone:', error);
      this.startLocationWeather = null;
      this.weatherLoading = false;
    }
  });
}

private fetchWeatherForEndLocation(): void {
  const locationId = this.tripForm.get('endLocationId')?.value;
  if (!locationId) return;
  
  const zoneName = this.getZoneNameForLocation(locationId);
  if (!zoneName) {
    console.warn('No zone found for end location');
    this.endLocationWeather = null;
    return;
  }
  
  this.http.getWeatherByCity(zoneName).subscribe({
    next: (weather) => {
      if (weather) {

        const locationInfo = this.getSelectedEndLocationInfo();
        this.endLocationWeather = {
          ...weather,
          location: locationInfo
        };
      } else {
        this.endLocationWeather = null;
      }
    },
    error: (error) => {
      console.error('Error fetching weather for end zone:', error);
      this.endLocationWeather = null;
    }
  });
}
  
  fetchWeatherForBothLocations(): void {
    const startLocationId = this.tripForm.get('startLocationId')?.value;
    const endLocationId = this.tripForm.get('endLocationId')?.value;
    
    if (!startLocationId || !endLocationId) return;
    
    const startZoneName = this.getZoneNameForLocation(startLocationId);
    const endZoneName = this.getZoneNameForLocation(endLocationId);
    
    if (startZoneName && endZoneName) {
    
      this.weatherLoading = true;
      this.http.getWeatherForLocations(startZoneName, endZoneName).subscribe({
        next: ({ start, end }) => {
          this.startLocationWeather = start;
          this.endLocationWeather = end;
          this.weatherLoading = false;
          this.weatherError = false;
        },
        error: (error) => {
          console.error('Error fetching weather for both zones:', error);
          this.weatherLoading = false;
          this.weatherError = true;

          this.fetchWeatherForStartLocation();
          this.fetchWeatherForEndLocation();
        }
      });
    } else {
     
      this.fetchWeatherForStartLocation();
      this.fetchWeatherForEndLocation();
    }
  }
getSelectedStartLocationInfo(): string {
  const locationId = this.getStartLocationId();
  if (!locationId) return 'Non sélectionné';
  
  const location = this.locations.find(l => l.id === locationId);
  if (!location) return 'Lieu inconnu';
  
 
  let display = location.name;
  if (location.zoneName) {
    display += ` (Zone: ${location.zoneName})`;
  }
  
  return display;
}

getSelectedEndLocationInfo(): string {
  const locationId = this.getEndLocationId();
  if (!locationId) return 'Non sélectionné';
  
  const location = this.locations.find(l => l.id === locationId);
  if (!location) return 'Lieu inconnu';
  
  let display = location.name;
  if (location.zoneName) {
    display += ` (Zone: ${location.zoneName})`;
  }
  
  return display;
}

  
  getStartZoneName(): string | null {
    const locationId = this.tripForm.get('startLocationId')?.value;
    return this.getZoneNameForLocation(locationId);
  }

  getEndZoneName(): string | null {
    const locationId = this.tripForm.get('endLocationId')?.value;
    return this.getZoneNameForLocation(locationId);
  }

 
  hasZone(locationId: number): boolean {
    if (!locationId) return false;
    const location = this.locations.find(l => l.id === locationId);
    return !!(location && location.zoneName);
  }


  getStartWeatherInfo(): string {
    if (!this.startLocationWeather) return 'Aucune donnée météo';
    
    const zoneName = this.getStartZoneName();
    const locationName = this.getSelectedStartLocationInfo();
    
    return `Météo ${zoneName ? `pour la zone ${zoneName}` : `à ${locationName}`}: ${this.startLocationWeather.description}, ${this.startLocationWeather.temperature}°C`;
  }

  getEndWeatherInfo(): string {
    if (!this.endLocationWeather) return 'Aucune donnée météo';
    
    const zoneName = this.getEndZoneName();
    const locationName = this.getSelectedEndLocationInfo();
    
    return `Météo ${zoneName ? `pour la zone ${zoneName}` : `à ${locationName}`}: ${this.endLocationWeather.description}, ${this.endLocationWeather.temperature}°C`;
  }
  
  getWeatherIconClass(iconCode: string): string {
    return this.http.getWeatherIconClass(iconCode);
  }
  

shouldShowWeather(): boolean {
  return !!(this.startLocationWeather || this.endLocationWeather) || this.weatherLoading;
}

shouldShowWeatherWarning(): boolean {
  
  if (!this.startLocationWeather && !this.endLocationWeather) {
    return false;
  }

  const weatherConditionsToCheck = [];
  if (this.startLocationWeather) weatherConditionsToCheck.push(this.startLocationWeather);
  if (this.endLocationWeather) weatherConditionsToCheck.push(this.endLocationWeather);


  const warningThresholds = {
    heavyRain: 10, 
    strongWind: 40, 
    extremeTemperature: { min: -10, max: 35 }, 
    heavySnow: 5,
  };

  return weatherConditionsToCheck.some(weather => {
   
    if (weather.precipitation && weather.precipitation > warningThresholds.heavyRain) {
      return true;
    }

    if (weather.wind_speed > warningThresholds.strongWind) {
      return true;
    }

    if (
      weather.temperature < warningThresholds.extremeTemperature.min ||
      weather.temperature > warningThresholds.extremeTemperature.max
    ) {
      return true;
    }

    const severeKeywords = [
      'orage', 'thunderstorm',
      'tempête', 'storm',
      'forte pluie', 'heavy rain',
      'neige', 'snow',
      'grêle', 'hail',
      'brouillard', 'fog'
    ];
    
    const hasSevereCondition = severeKeywords.some(keyword => 
      weather.description.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return hasSevereCondition;
  });
}

refreshWeather(): void {
  this.weatherLoading = true;
  
  this.startLocationWeather = null;
  this.endLocationWeather = null;
  this.startLocationForecast = [];
  this.endLocationForecast = [];
  
  this.fetchWeatherForBothLocations();
}


toggleWeatherForecast(): void {
  this.showWeatherForecast = !this.showWeatherForecast;
  
  if (this.showWeatherForecast && this.startLocationForecast.length === 0 && this.endLocationForecast.length === 0) {
    this.fetchWeatherForecast();
  }
}

fetchWeatherForecast(): void {
  const startLocationId = this.tripForm.get('startLocationId')?.value;
  const endLocationId = this.tripForm.get('endLocationId')?.value;
  
  if (!startLocationId || !endLocationId) return;
  
  const startZoneName = this.getZoneNameForLocation(startLocationId);
  const endZoneName = this.getZoneNameForLocation(endLocationId);
  
  if (startZoneName && endZoneName) {
    forkJoin({
      startForecast: this.http.getWeatherForecast(startZoneName),
      endForecast: this.http.getWeatherForecast(endZoneName)
    }).subscribe({
      next: ({ startForecast, endForecast }) => {
        this.startLocationForecast = startForecast || [];
        this.endLocationForecast = endForecast || [];
      },
      error: (error) => {
        console.error('Error fetching forecasts:', error);
        this.startLocationForecast = [];
        this.endLocationForecast = [];
      }
    });
  }
}


private fetchForecasts(): void {
  const startZoneName = this.getStartZoneName();
  const endZoneName = this.getEndZoneName();

  const requests: any[] = [];

  if (startZoneName) {
    requests.push(
      this.http
        .getWeatherForecast(startZoneName)
        .pipe(map(forecast => ({ forecast, type: 'start' })))
    );
  }

  if (endZoneName) {
    requests.push(
      this.http
        .getWeatherForecast(endZoneName)
        .pipe(map(forecast => ({ forecast, type: 'end' })))
    );
  }

  if (!requests.length) return;

  forkJoin(requests).subscribe({
    next: results => {
      results.forEach(r => {
        if (r.type === 'start') {
          this.startLocationForecast = r.forecast;
        }
        if (r.type === 'end') {
          this.endLocationForecast = r.forecast;
        }
      });
    },
    error: err => console.error('Error fetching forecasts:', err)
  });
}


get getCurrentTime(): string {
  return this.datePipe.transform(new Date(), 'HH:mm') || '';
}

private getZoneNameForLocation(locationId: number): string | null {
  if (!locationId) return null;
  
  const location = this.locations.find(l => l.id === locationId);
  if (!location) return null;
  
  if (location.zoneName) {
    return location.zoneName;
  }
  
  return location.name;
}

showAllDrivers(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
  
  const date = this.tripForm.get('estimatedStartDate')?.value;
  if (date) {
    const dateStr = this.formatDateForAPI(date);
    const excludeTripId = this.data.tripId;
    
    this.loadingAvailableDrivers = true;
    
    this.http.getAvailableDriversByDateAndZone(dateStr, undefined, excludeTripId).subscribe({
      next: (response: any) => {
        this.processDriverResponse(response, date);
        this.loadingAvailableDrivers = false;
        
        this.snackBar.open(
          `Affichage de tous les chauffeurs (${this.availableDrivers.length} disponible(s))`,
          'Fermer', 
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('Error loading all drivers:', error);
        this.loadingAvailableDrivers = false;
      }
    });
  }
}
private loadAvailableDriversByDateAndZone(date: Date, zoneId: number | undefined): void {
  if (!date) {
    if (zoneId) {
      this.loadDriversByZone(zoneId);
    } else {
      this.availableDrivers = [...this.drivers];
      this.unavailableDrivers = [];
    }
    return;
  }
  
  const dateStr = this.formatDateForAPI(date);
  const excludeTripId = this.data.tripId || undefined;
  
  this.loadingAvailableDrivers = true;
  

  this.http.getAvailableDriversByDateAndZone(dateStr, zoneId, excludeTripId).subscribe({
    next: (response: any) => {
      this.processDriverResponse(response, date);
      this.loadingAvailableDrivers = false;
      
    },
    error: (error) => {
      console.error('Error loading drivers by date and zone:', error);
      this.handleDriverLoadError(date, zoneId);
      this.loadingAvailableDrivers = false;
    }
  });
}

private handleDriverLoadError(date: Date , zoneId: number | null = null): void {
  console.error('Driver load error - Date:', date, 'Zone:', zoneId);
  
  if (date && zoneId) {

    const dateStr = this.formatDateForAPI(date);
    this.http.getAvailableDriversByDateAndZone(dateStr, undefined).subscribe({
      next: (response: any) => {
        this.processDriverResponse(response, date);
 
        if (zoneId) {
          this.availableDrivers = this.availableDrivers.filter(driver => driver.zoneId === zoneId);
        }
      },
      error: (fallbackError) => {
        console.error('Fallback also failed:', fallbackError);
        this.availableDrivers = [...this.drivers];
        this.unavailableDrivers = [];
      }
    });
  } else if (zoneId) {
 
    this.http.getAvailableDriversByDateAndZone('', zoneId).subscribe({
      next: (response: any) => {
        this.processDriverResponse(response, date);
      },
      error: (fallbackError) => {
        console.error('Fallback also failed:', fallbackError);
        this.availableDrivers = [...this.drivers];
        this.unavailableDrivers = [];
      }
    });
  } else {
    this.availableDrivers = [...this.drivers];
    this.unavailableDrivers = [];
  }
}

private processDriverResponse(response: any, date: Date): void {
 
  this.availableDrivers = (response.availableDrivers || []).map((apiDriver: any) => ({
    id: apiDriver.driverId,
    name: apiDriver.driverName,
    permisNumber: apiDriver.permisNumber || '',
    phone: apiDriver.phone || '',
    email: apiDriver.email || '',
    phoneCountry: apiDriver.phoneCountry || '+216',
    status: apiDriver.status || 'active',
    idCamion: apiDriver.idCamion || null,
    isActive: true,
    zoneId: apiDriver.zoneId || null,
    zoneName : apiDriver.zoneName || ''
  }));
  
  this.unavailableDrivers = response.unavailableDrivers || [];
  

  this.handleCurrentDriverForEdit(response);
  
 
  this.checkNoDriversWarning(date, response);
}


private refreshDriversByDateAndZone(): void {
 
  if (this.locations.length === 0) {
    console.warn('Locations not loaded yet');
    return;
  }
  
  const startDate = this.tripForm.get('estimatedStartDate')?.value;
  const locationId = this.tripForm.get('startLocationId')?.value;
  
  if (!locationId) {
    console.warn('No start location selected');
    return;
  }
  
  const zoneId = this.getStartLocationZoneId();
  
  if (!zoneId) {
    console.error('Zone ID is undefined for location:', locationId);
    const location = this.locations.find(l => l.id === locationId);
    console.error('Location data:', location);
    return;
  }
  
  console.log('Loading drivers for Zone:', zoneId, 'Date:', startDate);
  
  if (startDate) {
    this.loadAvailableDriversByDateAndZone(startDate, zoneId);
  } else {
    this.loadDriversByZone(zoneId);
  }
}


getStartLocationZoneId(): number | undefined {
  const locationId = this.tripForm.get('startLocationId')?.value;
  if (!locationId) return undefined;
  
  const location = this.locations.find(l => l.id === locationId);
  return location?.zoneId || undefined;
}


getStartLocationZoneName(): string | null {
  const zoneId = this.getStartLocationZoneId();
  if (!zoneId) return null;
  
  const locationId = this.tripForm.get('startLocationId')?.value;
  if (!locationId) return null;
  
  const location = this.locations.find(l => l.id === locationId);
  return location?.zoneName || null;
}

getDriverZoneName(driverId: number | null): string | null {
  if (!driverId) return null;

  const driver = this.drivers.find(d => d.id === driverId);
  if (!driver?.zoneName) return null;
  console.log(driver.zoneName)
  return driver.zoneName;
}



isDriverInSameZone(driverId: number): boolean {
  const driver = this.drivers.find(d => d.id === driverId);
  const startZoneId = this.getStartLocationZoneId();
  return driver?.zoneId === startZoneId;
}


loadDriversByZone(zoneId: number): void {
  this.loadingAvailableDrivers = true;
  
  const currentDriverId = this.data.tripId ? this.tripForm.get('driverId')?.value : null;
  
  this.http.getDriversByZone(zoneId).subscribe({
    next: (drivers: IDriver[]) => {
      if (this.data.tripId && currentDriverId) {
        const currentDriver = this.drivers.find(d => d.id === currentDriverId);
        if (currentDriver) {
          const alreadyInList = drivers.some(d => d.id === currentDriverId);
          if (!alreadyInList) {
            drivers.push(currentDriver);
          }
        }
      }
      
      this.availableDrivers = drivers;
      this.loadingAvailableDrivers = false;
      
      console.log(`Loaded ${drivers.length} drivers for zone ${zoneId} (edit mode: ${this.data.tripId})`);
    },
    error: (error) => {
      console.error('Error loading drivers by zone:', error);
      this.loadingAvailableDrivers = false;
      
      this.availableDrivers = [...this.drivers];
      
      this.snackBar.open(
        'Erreur lors du chargement des chauffeurs par zone, affichage de tous les chauffeurs',
        'Fermer', 
        { duration: 3000 }
      );
    }
  });
}


private handleCurrentDriverForEdit(response: any): void {
  const driverId = this.tripForm.get('driverId')?.value;
  if (driverId && !this.data.tripId) {
   
    const currentDriverInResponse = response.availableDrivers?.find((d: any) => d.driverId === driverId);
    if (currentDriverInResponse) {
     
      const driver = this.drivers.find(d => d.id === driverId);
      if (driver && !this.availableDrivers.some(d => d.id === driverId)) {
        this.availableDrivers.push(driver);
      }
    }
  }
}


private checkNoDriversWarning(date: Date, response: any): void {
  if (this.availableDrivers.length === 0 && this.drivers.length > 0) {
    const zoneName = this.getStartLocationZoneName();
    
    let warningMessage = `Aucun chauffeur disponible le ${this.formatDateForDisplay(date)}`;
    if (zoneName) {
      warningMessage += ` dans la zone ${zoneName}`;
    }
    
    if (response.unavailableDrivers && response.unavailableDrivers.length > 0) {
      warningMessage += ` (${response.unavailableDrivers.length} chauffeur(s) indisponible(s))`;
    }
    
    console.warn(warningMessage);
  }
}
shouldShowWeatherPrompt(): boolean {
  const hasLocations = this.tripForm.get('startLocationId')?.value || this.tripForm.get('endLocationId')?.value;
  const weatherNotLoaded = !this.startLocationWeather && !this.endLocationWeather && !this.weatherLoading;
  return hasLocations && weatherNotLoaded;
}

showCalendarModal = false;
selectedDateField: 'start' | 'end' | null = null;
calendarTitle = '';
currentMonth = new Date().getMonth();
currentYear = new Date().getFullYear();
calendarDays: (Date | null)[] = [];
weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];


getFormattedDay(date: Date): string {
  if (!date) return 'JJ';
  return this.datePipe.transform(date, 'dd') || '';
}

getFormattedMonth(date: Date): string {
  if (!date) return 'MMM';
  return this.datePipe.transform(date, 'MMM')?.toUpperCase() || '';
}

getFormattedYear(date: Date): string {
  if (!date) return 'AAAA';
  return this.datePipe.transform(date, 'yyyy') || '';
}


openStartDatePicker(): void {
  this.selectedDateField = 'start';
  this.calendarTitle = 'Sélectionner la date de début';
  this.showCalendarModal = true;
  this.generateCalendar();
}

openEndDatePicker(): void {
  this.selectedDateField = 'end';
  this.calendarTitle = 'Sélectionner la date de fin';
  this.showCalendarModal = true;
  this.generateCalendar();
}

closeCalendarModal(): void {
  this.showCalendarModal = false;
  this.selectedDateField = null;
}

generateCalendar(): void {
  this.calendarDays = [];
  
  const firstDay = new Date(this.currentYear, this.currentMonth, 1);
  const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
  
 
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  for (let i = 0; i < startDay; i++) {
    this.calendarDays.push(null);
  }
  
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    this.calendarDays.push(new Date(this.currentYear, this.currentMonth, i));
  }
}

getCurrentMonthYear(): string {
  return this.datePipe.transform(new Date(this.currentYear, this.currentMonth), 'MMMM yyyy') || '';
}

previousMonth(): void {
  if (this.currentMonth === 0) {
    this.currentMonth = 11;
    this.currentYear--;
  } else {
    this.currentMonth--;
  }
  this.generateCalendar();
}

nextMonth(): void {
  if (this.currentMonth === 11) {
    this.currentMonth = 0;
    this.currentYear++;
  } else {
    this.currentMonth++;
  }
  this.generateCalendar();
}

isDaySelected(day: Date | null): boolean {
  if (!day || !this.selectedDateField) return false;
  
  const formDate = this.selectedDateField === 'start' 
    ? this.tripForm.get('estimatedStartDate')?.value
    : this.tripForm.get('estimatedEndDate')?.value;
  
  if (!formDate) return false;
  
  return this.datePipe.transform(formDate, 'yyyy-MM-dd') === this.datePipe.transform(day, 'yyyy-MM-dd');
}

isDayDisabled(day: Date | null): boolean {
  if (!day) return true;
  

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (day < today) return true;
  

  if (this.calendarMode === 'range') {
    if (this.selectedRangeStart && day < this.selectedRangeStart) {
      return true;
    }
  } else if (this.selectedDateField === 'end') {
    const startDate = this.estimatedStartDateControl?.value;
    if (startDate && day < new Date(startDate)) {
      return true;
    }
  }
  
  return false;
}

selectToday(): void {
  const today = new Date();
  
  if (this.calendarMode === 'single') {
    this.selectDate(today);
  } else if (this.calendarMode === 'range') {
    this.selectDateRange(today);
    
    if (!this.selectedRangeEnd) {
      this.selectedRangeEnd = new Date(today);
      this.isSelectingRange = false;
    }
  }
}

clearDate(): void {
  if (this.calendarMode === 'single') {
    if (this.selectedDateField === 'start') {
    
      this.estimatedStartDateControl?.setValue(null);
    } else if (this.selectedDateField === 'end') {
      
      this.estimatedEndDateControl?.setValue(null);
    }
  } else if (this.calendarMode === 'range') {
    this.clearDateRange();
  }
}

confirmDate(): void {
  this.closeCalendarModal();
}
private dateSequenceValidator(control: AbstractControl): ValidationErrors | null {
  const startDate = this.estimatedStartDateControl?.value;
  const endDate = control.value;
  
 
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    if (end < start) {
      return { 
        dateSequence: {
          message: 'La date de fin doit être après la date de début',
          startDate: startDate,
          endDate: endDate
        }
      };
    }
  }
  
  return null;
}
get estimatedStartDateControl(): FormControl | null {
  return this.tripForm?.get('estimatedStartDate') as FormControl || null;
}

get estimatedEndDateControl(): FormControl | null {
  return this.tripForm?.get('estimatedEndDate') as FormControl || null;
}

calculateDateDuration(): number {
  
  const start = this.estimatedStartDateControl?.value;
  const end = this.estimatedEndDateControl?.value;
  
  if (!start || !end) return 0;
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0;
  }
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

showDateRangeModal = false;
calendarMode: 'single' | 'range' = 'range';
selectedRangeStart: Date | null = null;
selectedRangeEnd: Date | null = null;
isSelectingRange = false;


openDateRangePicker(): void {
  this.calendarMode = 'range';
  this.showDateRangeModal = true;
  
  
  this.selectedRangeStart = this.estimatedStartDateControl?.value;
  this.selectedRangeEnd = this.estimatedEndDateControl?.value;
  
 
  if (this.selectedRangeStart && !this.selectedRangeEnd) {
    this.selectedRangeEnd = new Date(this.selectedRangeStart);
    this.isSelectingRange = false;
  } else if (!this.selectedRangeStart) {
    this.isSelectingRange = true;
  } else {
    this.isSelectingRange = false;
  }
  
  this.generateCalendar();
}
selectDateRange(day: Date | null): void {
  if (!day || this.isDayDisabled(day)) return;
  
  if (!this.selectedRangeStart || (this.selectedRangeStart && this.selectedRangeEnd)) {
    this.selectedRangeStart = day;
    this.selectedRangeEnd = null;
    this.isSelectingRange = true;
  } else if (this.selectedRangeStart && !this.selectedRangeEnd) {

    if (day < this.selectedRangeStart) {
      this.snackBar.open(
        'La date de fin ne peut pas être avant la date de début',
        'Fermer',
        { duration: 3000 }
      );
      return;
    }
    
    this.selectedRangeEnd = day;
    this.isSelectingRange = false;
    
    if (this.isSameDay(this.selectedRangeStart, this.selectedRangeEnd)) {
      this.applyDateRange();
    }
  }
}

applyDateRange(): void {
  if (this.selectedRangeStart && this.selectedRangeEnd) {
    if (this.selectedRangeEnd < this.selectedRangeStart) {
      this.snackBar.open(
        'La date de fin ne peut pas être avant la date de début',
        'Fermer',
        { duration: 3000 }
      );
      return;
    }
  }
  
  if (this.selectedRangeStart) {
   
    this.estimatedStartDateControl?.setValue(this.selectedRangeStart);
    
    if (!this.selectedRangeEnd) {
      this.selectedRangeEnd = new Date(this.selectedRangeStart);
    }
    
    this.estimatedEndDateControl?.setValue(this.selectedRangeEnd);    
    this.estimatedEndDateControl?.updateValueAndValidity();
  }
  
  this.closeDateRangeModal();
}

closeDateRangeModal(): void {
  this.showDateRangeModal = false;
  this.selectedRangeStart = null;
  this.selectedRangeEnd = null;
  this.isSelectingRange = false;
}

isDateInRange(day: Date | null): boolean {
  if (!day || !this.selectedRangeStart) return false;
  
  if (this.selectedRangeStart && this.selectedRangeEnd) {
    return day >= this.selectedRangeStart && day <= this.selectedRangeEnd;
  } else if (this.selectedRangeStart && !this.selectedRangeEnd && this.isSelectingRange) {
 
    return this.isSameDay(day, this.selectedRangeStart);
  }
  
  return false;
}

isRangeStart(day: Date | null): boolean {
  return day && this.selectedRangeStart ? this.isSameDay(day, this.selectedRangeStart) : false;
}

isRangeEnd(day: Date | null): boolean {
  return day && this.selectedRangeEnd ? this.isSameDay(day, this.selectedRangeEnd) : false;
}

isSameDay(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false;
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

selectDate(day: Date | null): void {
  if (!day || this.isDayDisabled(day)) return;
  
  if (this.calendarMode === 'single') {
    if (this.selectedDateField === 'start') {

      this.estimatedStartDateControl?.setValue(day);

      this.estimatedEndDateControl?.setValue(new Date(day));
      this.confirmDate();
    } else if (this.selectedDateField === 'end') {

      this.estimatedEndDateControl?.setValue(day);
      this.confirmDate();
    }
  } else if (this.calendarMode === 'range') {
    this.selectDateRange(day);
  }
}
calculateRangeDuration(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
}

clearDateRange(): void {
  this.selectedRangeStart = null;
  this.selectedRangeEnd = null;
  this.isSelectingRange = false;
  
  this.estimatedStartDateControl?.setValue(null);
  this.estimatedEndDateControl?.setValue(null);
}
goBackToOrderSelection(): void {
  // Remove the deliveries that were just added in Step 3
  this.removeRecentlyAddedDeliveries();
  
  // Go back to Step 2
  this.currentQuickAddStep = 2;
  
  // Restore the orders to the selection (they were removed when added to deliveries)
  this.restoreOrdersToSelection();
  
  // Scroll to top
  setTimeout(() => {
    const orderSelectionSection = document.querySelector('.order-selection-step');
    if (orderSelectionSection) {
      orderSelectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

private removeRecentlyAddedDeliveries(): void {
  if (!this.selectedClient) return;
  
 
  const deliveriesToRemove: number[] = [];
  
  this.deliveryControls.forEach((delivery, index) => {
    const customerId = delivery.get('customerId')?.value;
    if (customerId && parseInt(customerId) === this.selectedClient!.id) {
      deliveriesToRemove.push(index);
    }
  });
  

  deliveriesToRemove.sort((a, b) => b - a).forEach(index => {
    this.removeDelivery(index);
  });
}

private restoreOrdersToSelection(): void {
  if (!this.selectedClient) return;
  
  
  const clientOrderIds = this.clientPendingOrders.map(order => order.id);
  this.selectedOrders = [...clientOrderIds];
}

}