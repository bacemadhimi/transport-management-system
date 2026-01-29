import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef, computed, Output, EventEmitter, Input, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { IOrder, OrderStatus, UpdateOrderDto, getOrderStatusText } from '../../types/order';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommonModule } from '@angular/common';
import { OrderFormComponent } from './order-form/order-form';
import { MatIconModule } from '@angular/material/icon';
import { Auth } from '../../services/auth'; 
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatSnackBarModule,
    MatTableModule,
    MatCheckboxModule,
    CommonModule,
    Table,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
       MatDatepickerModule,    
    MatNativeDateModule ,    
  ],
  templateUrl: './order.html',
  styleUrls: ['./order.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
  activeFilter: string | null = null;
    @ViewChild('referenceFilter') referenceFilterDiv!: ElementRef;
 @ViewChild('customerNameFilter') customerNameFilterDiv!: ElementRef;
     @ViewChild('customerCityFilter') customerCityFilterDiv!: ElementRef;
    
  columnFilters: { [key: string]: string } = {
  reference: '',
  customerName: '',
   customerCity: '',
};
deliveryDateStartControl = new FormControl<Date | null>(null);
deliveryDateEndControl   = new FormControl<Date | null>(null);
dataSource = new MatTableDataSource<IOrder>([]); 

selectAllFiltered: boolean = false;  
allFilteredIds: number[] = [];      
toggleFilter(column: string) {
  if (this.activeFilter === column) {
    this.activeFilter = null; 
  } else {
    this.activeFilter = column; 
  }
}

 @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.activeFilter === 'reference' && this.referenceFilterDiv) {
      const clickedInside = this.referenceFilterDiv.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.activeFilter = null;
      }
    }

    if (this.activeFilter === 'customerName' && this.customerNameFilterDiv) {
      const clickedInside = this.customerNameFilterDiv.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.activeFilter = null;
      }
    }

      if (this.activeFilter === 'customerCity' && this.customerCityFilterDiv) {
      const clickedInside = this.customerCityFilterDiv.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.activeFilter = null;
      }
    }

  }
  displayedColumns: string[] = [
    'select',
    'reference',
    'client',
    'customerCity',          
    'weight',
    'weightUnit',
    'status',
    'source',
    'creationDate',
    'deliveryDate',
    'action'
  ];

  
applyAllFilters() {
  this.dataSource.filterPredicate = (data: IOrder, filter: string) => {
    return Object.keys(this.columnFilters).every(key => {
      const filterValue = this.columnFilters[key]?.toLowerCase() || '';
      const dataValue = (data as any)[key]?.toString().toLowerCase() || '';
      return dataValue.includes(filterValue);
    });
  };
  this.dataSource.filter = '' + Math.random(); 
}
   OrderStatus = OrderStatus; 
    zones: string[] = []; 
  circuits: string[] = []; 
    zoneControl = new FormControl('');
  circuitControl = new FormControl('');
  deliveryDateControl = new FormControl('');
  statusControl = new FormControl('');
sourceControl = new FormControl('');
  searchControl = new FormControl('');


    constructor(public auth: Auth, private snackBar: MatSnackBar) {}  

     showSuccess() {
    this.snackBar.open('Succès', 'OK', { duration: 2000 });
     
  }
    @Output() rowClick = new EventEmitter<any>();
     @Input() showApproveButton: boolean = false;
     
getActions(row: any, actions: string | string[] | undefined): string[] {
  if (!actions) return [];
  return Array.isArray(actions) ? actions : [actions];
}


  
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  
  httpService = inject(Http);
  pagedOrderData: PagedData<IOrder> = {
    data: [],
    totalData: 0
  };
  
  totalData: number = 0;

  filter: any = {
    pageIndex: 0,
    pageSize: 20,
    search: '',
    status: '',
    sourceSystem: '' ,
  deliveryDateStart: '',
  deliveryDateEnd: ''
  };





  readonly dialog = inject(MatDialog);



get allOrdersCount(): number {
  return this.pagedOrderData?.totalData || 0;
}

get pendingOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Pending).length;
}

get readyToLoadOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.ReadyToLoad).length;
}

get inProgressOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.InProgress).length;
}

get receivedOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Received).length;
}

get closedOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Closed).length;
}

get cancelledOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Cancelled).length;
}
get currentPagePendingCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Pending).length;
}
  
  get totalPendingCount(): number {

    return this.currentPagePendingCount;
  }

  ngOnInit() {
  this.zones = ['Zone 1', 'Zone 2', 'Zone 3']; 
  this.circuits = ['Circuit A', 'Circuit B'];
    this.initializeData();
    
    this.searchControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe((value: string | null) => {
        this.filter.search = value || '';
        this.filter.pageIndex = 0;
        this.getLatestData();
      });

    this.statusControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: string | null) => {
        this.filter.status = value || '';
        this.filter.pageIndex = 0;
        this.getLatestData();
      });

      this.sourceControl.valueChanges
  .pipe(takeUntil(this.destroy$))
  .subscribe((value: string | null) => {
    this.filter.sourceSystem = value || '';
    this.filter.pageIndex = 0;
    this.getLatestData();
  });

  this.deliveryDateStartControl.valueChanges
  .pipe(takeUntil(this.destroy$))
  .subscribe(date => {
    this.filter.deliveryDateStart = date
      ? date.toISOString()
      : '';
    this.filter.pageIndex = 0;
    this.getLatestData();
  });

this.deliveryDateEndControl.valueChanges
  .pipe(takeUntil(this.destroy$))
  .subscribe(date => {
    this.filter.deliveryDateEnd = date
      ? date.toISOString()
      : '';
    this.filter.pageIndex = 0;
    this.getLatestData();
  });


  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeData() {
    this.getLatestData();
  }

getLatestData() {
  this.httpService.getOrdersList(this.filter).subscribe({
    next: (result: any) => {
      const dataArray = result?.data?.data || [];
      const totalCount = result?.data?.totalData || 0;

      const processedData = dataArray.map((order: any) => {
        let orderStatus: OrderStatus;

        switch (String(order.status).toLowerCase()) {
          case 'pending': orderStatus = OrderStatus.Pending; break;
          case 'readytoload': orderStatus = OrderStatus.ReadyToLoad; break;
          case 'inprogress': orderStatus = OrderStatus.InProgress; break;
          case 'received': orderStatus = OrderStatus.Received; break;
          case 'closed': orderStatus = OrderStatus.Closed; break;
          case 'cancelled': orderStatus = OrderStatus.Cancelled; break;
          default: orderStatus = OrderStatus.Pending;
        }

        return {
          ...order,
          status: orderStatus,
          customerName: order.customerName || 'Non spécifié',
          customerCity: order.customerCity || '-', 
          createdDate: order.createdDate || new Date().toISOString(),
          deliveryDate: order.deliveryDate ?? null,
          sourceSystem: order.sourceSystem
        };
      });

      this.pagedOrderData = {
        data: processedData,
        totalData: totalCount
      };


      this.dataSource.data = this.pagedOrderData.data;
      this.applyAllFilters(); 
      this.totalData = totalCount;
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error loading orders:', error);
      this.pagedOrderData = { data: [], totalData: 0 };
      this.dataSource.data = [];
      this.totalData = 0;
      this.cdr.detectChanges();
    }
  });
}

getStatusText(status: any): string {
  const statusStr = String(status).trim().toLowerCase();

  if (statusStr === 'completed' || statusStr === 'delivered') {
    return 'Terminée';
  }
  if (statusStr === 'pending') {
    return 'En attente';
  }
  if (statusStr === 'readytoload' || statusStr === 'readytoload') {
    return 'Prête au chargement';
  }
  if (statusStr === 'inprogress') {
    return 'En cours';
  }
  if (statusStr === 'received') {
    return 'Réception';
  }
  if (statusStr === 'cancelled') {
    return 'Annulée';
  }

  return statusStr;
}


getStatusClass(status: any): string {
  const statusStr = String(status).trim().toLowerCase();

  if (statusStr === 'completed' || statusStr === 'delivered') {
    return 'status-completed';
  }
  if (statusStr === 'pending') {
    return 'status-pending';
  }
  if (statusStr === 'readytoload') {
        return 'status-ready'; 
  }
  if (statusStr === 'inprogress') {
    return 'status-in-progress';
  }
  if (statusStr === 'cancelled') {
    return 'status-cancelled';
  }

  return '';
}


formatDate(date: any): string {
  if (!date) return '-';
  
  try {
  
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
     
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      
      dateObj = new Date(date);
    } else {
  
      dateObj = new Date();
    }
    
   
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return '-';
    }
    
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
  } catch (error) {
    console.error('Error formatting date:', date, error);
    return '-';
  }
}

  add() {
    const ref = this.dialog.open(OrderFormComponent, {
      width: '900px', 
      maxWidth: '95vw', 
      maxHeight: '90vh', 
      panelClass: ['dialog-overlay', 'wide-dialog'], 
      data: {}
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.getLatestData();
      }
    });
  }

  edit(order: IOrder) {
    const ref = this.dialog.open(OrderFormComponent, {
      width: '900px', 
      maxWidth: '95vw', 
      maxHeight: '90vh', 
      panelClass: ['dialog-overlay', 'wide-dialog'], 
      data: { orderId: order.id }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.getLatestData();
      }
    });
  }

  delete(order: IOrder) {
    if (confirm(`Voulez-vous vraiment supprimer la commande "${order.reference}"? Cette action est irréversible.`)) {
      this.httpService.deleteOrder(order.id).subscribe({
        next: () => {
          alert("Commande supprimée avec succès");
          this.getLatestData();
        },
        error: (error) => {
          console.error('Error deleting order:', error);
          alert("Erreur lors de la suppression de la commande");
        }
      });
    }
  }

pageChange(event: any) {
  this.filter.pageIndex = event.pageIndex;
  this.filter.pageSize = event.pageSize;
  this.getLatestData();
}


  onRowClick(event: any) {
    
    if (event.btn === "Modifier" && event.rowData) {
      this.edit(event.rowData);
    }
    if (event.btn === "Supprimer" && event.rowData) {
      this.delete(event.rowData);
    }
    if (event.btn === "Prête au chargement" && event.rowData) {
  this.markReadyToLoad(event.rowData);
}

  }

  exportCSV() {
    if (!this.pagedOrderData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    const rows = this.pagedOrderData.data;
    
    const csvContent = [
      ['ID', 'Référence', 'Client', 'Poids (kg)', 'Statut', 'Date création', 'Adresse', 'Notes'],
      ...rows.map(o => [
        o.id,
        `"${o.reference}"`,
        `"${o.customerName}"`,
        o.weight || 0,
        `"${this.getStatusText(o.status)}"`,
        `"${this.formatDate(o.createdDate)}"`,
        `"${o.deliveryAddress || ''}"`,
        `"${o.notes || ''}"`
      ])
    ]
      .map(e => e.join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commandes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  exportExcel() {
    if (!this.pagedOrderData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    const data = this.pagedOrderData.data.map(order => ({
      'ID': order.id,
      'Référence': order.reference,
      'Client': order.customerName,
      'Poids (kg)': order.weight || 0,
      'Statut': this.getStatusText(order.status),
      'Date création': this.formatDate(order.createdDate),
      'Adresse livraison': order.deliveryAddress || '',
      'Notes': order.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { 'Commandes': worksheet },
      SheetNames: ['Commandes']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, `commandes_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    if (!this.pagedOrderData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    const doc = new jsPDF('landscape');
    
    const headers = [['ID', 'Référence', 'Client', 'Poids (kg)', 'Statut', 'Date création']];
    const body = this.pagedOrderData.data.map(o => [
      o.id.toString(),
      o.reference,
      o.customerName,
      (o.weight || 0).toString(),
      this.getStatusText(o.status),
      this.formatDate(o.createdDate)
    ]);

    doc.setFontSize(16);
    doc.text('Liste des Commandes', 14, 15);
    
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    doc.text(`Date d'export: ${dateStr}`, 14, 25);

    autoTable(doc, {
      startY: 30,
      head: headers,
      body: body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { left: 14, right: 14 }
    });

    doc.save(`commandes_${new Date().toISOString().split('T')[0]}.pdf`);
  }

selectedOrders = new Set<any>();
cols: any[] = [];



isSelected(element: IOrder) {
  return this.selectedOrders.has(element.id);
}

toggleSelection(element: IOrder) {
  if (this.selectedOrders.has(element.id)) {
    this.selectedOrders.delete(element.id);
    this.selectAllFiltered = false; // décocher "select all" si on retire un élément
  } else {
    this.selectedOrders.add(element.id);
  }
}


isAllSelected() {
  return this.selectedOrders.size > 0 && 
         this.selectedOrders.size === this.allFilteredIds.length;
}

isIndeterminate() {
  return this.selectedOrders.size > 0 && !this.isAllSelected();
}



toggleSelectAll(event: any) {
  if (event.checked) {
    this.selectAllFiltered = true;

   
    this.httpService.getFilteredOrderIds(this.filter).subscribe(ids => {
      this.allFilteredIds = ids;       // IDs de toutes les commandes filtrées
      this.selectedOrders = new Set(ids);
    });

  } else {
    this.selectAllFiltered = false;
    this.selectedOrders.clear();
    this.allFilteredIds = [];
  }
}




// Pour cocher/décocher une seule commande
toggleOrderSelection(orderId: number) {
  if (this.selectedOrders.has(orderId)) {
    this.selectedOrders.delete(orderId);
  } else {
    this.selectedOrders.add(orderId);
  }
}



markReadyToLoad(order: IOrder) {
  this.httpService.markOrdersReadyToLoad([order.id]).subscribe({
    next: () => {
      this.snackBar.open("Commande chargée avec succès", "OK", { duration: 3000 });
      this.getLatestData();
    },
    error: (err) => {
      console.error('Erreur chargement commande:', err);
      this.snackBar.open("Erreur lors du chargement", "OK", { duration: 3000 });
    }
  });
}


 hasPendingSelected(): boolean {
  // Si au moins une commande est sélectionnée, le bouton est activé
  return this.selectedOrders.size > 0;
}


markSelectedReadyToLoad() {

  if (this.selectedOrders.size === 0) {
    this.snackBar.open("Aucune commande sélectionnée", "OK", { duration: 3000 });
    return;
  }

  const ids = Array.from(this.selectedOrders);

  this.httpService.markOrdersReadyToLoad(ids).subscribe({
    next: () => {
      this.snackBar.open("Commandes chargées avec succès", "OK", { duration: 3000 });
      this.selectedOrders.clear();
      this.selectAllFiltered = false;
      this.getLatestData();
    },
    error: () => {
      this.snackBar.open("Erreur lors du chargement", "OK", { duration: 3000 });
    }
  });
}



onButtonClick(btn: string, rowData: any, event: MouseEvent) {
  event.stopPropagation(); 
  this.rowClick.emit({ btn, rowData });
}
canMarkReadyToLoad(order: any): boolean {
  const s = String(order.status).toLowerCase();
  return s !== 'readytoload' && s !== 'closed';
}

get filteredOrders(): IOrder[] {
  let data = this.pagedOrderData.data || [];
  if (this.filter.status) {
    data = data.filter(o => o.status === this.filter.status);
  }
  if (this.filter.sourceSystem) {
    data = data.filter(o => o.sourceSystem === this.filter.sourceSystem);
  }
  return data;
}
  getSourceClass(source: string): string {
    if (!source) return 'source-other';
    switch (source.toUpperCase()) {
      case 'TMS': return 'source-TMS';
      case 'QAD': return 'source-QAD';
      default: return 'source-other';
    }
  }

  statusOptions = [
  { value: '', label: 'Tous' },
  { value: OrderStatus.Pending, label: 'En attente' },
  { value: OrderStatus.ReadyToLoad, label: 'Prête au chargement' },
  { value: OrderStatus.InProgress, label: 'En cours de livraison' },
  { value: OrderStatus.Received, label: 'Réception' },
  { value: OrderStatus.Closed, label: 'Clôturée' },
  { value: OrderStatus.Cancelled, label: 'Annulée' }
];

sourceOptions = [
  { value: '', label: 'Toutes' },
  { value: 'TMS', label: 'TMS' },
  { value: 'QAD', label: 'QAD' }
];
resetFilters() {

  this.columnFilters = {
    reference: '',
    customerName: '',
    customerCity: ''
  };


  this.searchControl.setValue('');
  this.statusControl.setValue('');
  this.sourceControl.setValue('');
  this.deliveryDateStartControl.setValue(null);
  this.deliveryDateEndControl.setValue(null);
  this.circuitControl.setValue('');
  this.zoneControl.setValue('');


  this.filter = {
    pageIndex: 0,
    pageSize: 20,
    search: '',
    status: '',
    sourceSystem: '',
    deliveryDateStart: '',
    deliveryDateEnd: ''
  };


  this.selectedOrders.clear();
  this.selectAllFiltered = false;
  this.allFilteredIds = [];


  this.applyAllFilters();

  this.getLatestData();
}

}