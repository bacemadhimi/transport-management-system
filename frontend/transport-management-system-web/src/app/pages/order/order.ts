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
       MatDatepickerModule,    // <--- AJOUT
    MatNativeDateModule ,    // <--- AJOUT
  ],
  templateUrl: './order.html',
  styleUrls: ['./order.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
  activeFilter: string | null = null;
    @ViewChild('referenceFilter') referenceFilterDiv!: ElementRef;
 @ViewChild('customerNameFilter') customerNameFilterDiv!: ElementRef;
    
  columnFilters: { [key: string]: string } = {
  reference: '',
  customerName: ''
  // ajouter d'autres colonnes

  
};


dataSource = new MatTableDataSource<IOrder>([]); // <-- remplacer allOrders
toggleFilter(column: string) {
  if (this.activeFilter === column) {
    this.activeFilter = null; // fermer si déjà ouvert
  } else {
    this.activeFilter = column; // ouvrir le filtre pour cette colonne
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
  }
  displayedColumns: string[] = [
    'select',
    'reference',
    'client',
    'type',
    'weight',
    'status',
    'source',
    'creationDate',
    'deliveryDate',
    'priority',
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
  this.dataSource.filter = '' + Math.random(); // déclenche le filtre
}
   OrderStatus = OrderStatus; 
    zones: string[] = []; // <-- ajouté
  circuits: string[] = []; // pareil si tu utilises circuits dans le HTML
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
    sourceSystem: '' 
  };





  readonly dialog = inject(MatDialog);






  /// COMPUTED PROPERTIES
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
  // Statistics for all data (if you want to show counts for all orders, not just current page)
  get totalPendingCount(): number {
    // This would require loading all data or having a separate API endpoint
    // For now, we'll just show current page counts
    return this.currentPagePendingCount;
  }

  ngOnInit() {
  this.zones = ['Zone 1', 'Zone 2', 'Zone 3']; // exemple
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
      
      // Extract data from nested structure
      const dataArray = result?.data?.data || [];
      const totalCount = result?.data?.totalData || 0;
      console.log('dd'+dataArray)
      
      // Process the data
   const processedData = dataArray.map((order: any) => {
  // Convert string status to enum
  let orderStatus: OrderStatus;

  switch (String(order.status).toLowerCase()) {
    case 'pending':
      orderStatus = OrderStatus.Pending;
      break;
    case 'readytoload':
    case 'readyToLoad'.toLowerCase():
      orderStatus = OrderStatus.ReadyToLoad;
      break;
    case 'inprogress':
      orderStatus = OrderStatus.InProgress;
      break;
    case 'received':
      orderStatus = OrderStatus.Received;
      break;
    case 'closed':
      orderStatus = OrderStatus.Closed;
      break;
    case 'cancelled':
      orderStatus = OrderStatus.Cancelled;
      break;
    default:
      orderStatus = OrderStatus.Pending; // Default
  }

  return {
    ...order,
    status: orderStatus,
    customerName: order.customerName || 'Non spécifié',
    customerMatricule: order.customerMatricule || '',
    priority: order.priority || 5,
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
      
      this.totalData = totalCount;
      this.cdr.detectChanges();
      
      
    },
    error: (error) => {
      console.error('Error loading orders:', error);
      this.pagedOrderData = {
        data: [],
        totalData: 0
      };
      this.totalData = 0;
      this.cdr.detectChanges();
    }
  });
}

  // Helper methods
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

  // Actions
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
 
    if (event.pageIndex !== undefined) {
      this.filter.pageIndex = event.pageIndex;
      this.getLatestData();
    }
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




  // Export methods
  exportCSV() {
    if (!this.pagedOrderData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    const rows = this.pagedOrderData.data;
    
    const csvContent = [
      ['ID', 'Référence', 'Client', 'Type', 'Poids (kg)', 'Statut', 'Date création', 'Priorité', 'Adresse', 'Notes'],
      ...rows.map(o => [
        o.id,
        `"${o.reference}"`,
        `"${o.customerName}"`,
        `"${o.type || ''}"`,
        o.weight || 0,
        `"${this.getStatusText(o.status)}"`,
        `"${this.formatDate(o.createdDate)}"`,
        o.priority || 5,
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
      'Type': order.type || '',
      'Poids (kg)': order.weight || 0,
      'Statut': this.getStatusText(order.status),
      'Date création': this.formatDate(order.createdDate),
      'Priorité': order.priority || 5,
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
    
    const headers = [['ID', 'Référence', 'Client', 'Type', 'Poids (kg)', 'Statut', 'Date création', 'Priorité']];
    const body = this.pagedOrderData.data.map(o => [
      o.id.toString(),
      o.reference,
      o.customerName,
      o.type || '',
      (o.weight || 0).toString(),
      this.getStatusText(o.status),
      this.formatDate(o.createdDate),
      (o.priority || 5).toString()
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

  // =========== Sélection multiple ===========
selectedOrders = new Set<any>();
cols: any[] = [];



isSelected(element: any) {
  return this.selectedOrders.has(element);
}

toggleSelection(element: any) {
  if (this.selectedOrders.has(element)) {
    this.selectedOrders.delete(element);
  } else {
    this.selectedOrders.add(element);
  }
}

isAllSelected() {
  return this.pagedOrderData.data.length > 0 && this.selectedOrders.size === this.pagedOrderData.data.length;
}

isIndeterminate() {
  return this.selectedOrders.size > 0 && !this.isAllSelected();
}

toggleSelectAll(event: any) {
  if (event.checked) {
    this.pagedOrderData.data.forEach((el: any) => this.selectedOrders.add(el));
  } else {
    this.selectedOrders.clear();
  }
}
markReadyToLoad(order: IOrder) {
  const payload: UpdateOrderDto = {
    status: OrderStatus.ReadyToLoad
  };

  this.httpService.updateOrder(order.id, payload).subscribe({
    next: () => {
      this.snackBar.open("Commande chargée avec succès", "OK", { duration: 3000 });
      this.getLatestData();
    },
    error: () => {
      this.snackBar.open("Erreur lors du chargement", "OK", { duration: 3000 });
    }
  });
}
get hasPendingSelected(): boolean {
  return Array.from(this.selectedOrders).some(o => o.status === OrderStatus.Pending);
}
markSelectedReadyToLoad() {
  // garder uniquement les commandes Pending
  const pendingIds = Array.from(this.selectedOrders)
    .filter(o => o.status === OrderStatus.Pending)
    .map(o => o.id);

  if (!pendingIds.length) {
    this.snackBar.open("Aucune commande en attente sélectionnée", "OK", { duration: 3000 });
    return;
  }

  this.httpService.markOrdersReadyToLoad(pendingIds).subscribe({
    next: () => {
      this.snackBar.open("Commandes chargées avec succès", "OK", { duration: 3000 });
      this.selectedOrders.clear();
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

}