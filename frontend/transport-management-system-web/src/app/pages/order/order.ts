import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef, computed } from '@angular/core';
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
import { IOrder, OrderStatus, getOrderStatusText } from '../../types/order';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommonModule } from '@angular/common';
import { OrderFormComponent } from './order-form/order-form';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    Table,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule
  ],
  templateUrl: './order.html',
  styleUrls: ['./order.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
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
    pageSize: 10,
    search: '',
    status: '',
    sourceSystem: '' 
  };

  statusOptions = [
    { value: '', label: 'Tous' },
    { value: OrderStatus.Pending, label: 'En attente' },
    { value: OrderStatus.InProgress, label: 'En cours' },
    { value: OrderStatus.Delivered, label: 'Terminée' },
    { value: OrderStatus.Cancelled, label: 'Annulée' }
  ];

  searchControl = new FormControl('');
  statusControl = new FormControl('');
  sourceControl = new FormControl('');

  readonly dialog = inject(MatDialog);

  showCols = [
    { 
      key: 'reference', 
      label: 'Référence',
      sortable: true
    },
    { 
      key: 'customerName', 
      label: 'Client',
      sortable: true
    },
    { 
      key: 'type', 
      label: 'Type',
      sortable: true
    },
    { 
      key: 'weight', 
      label: 'Poids (tonne)',
      sortable: true,
      
    },{ 
  key: 'status', 
  label: 'Statut',
  sortable: true,
  format: (rowData: any) => {
    const statusValue = rowData.status;
    const statusText = this.getStatusText(statusValue);
    const statusClass = this.getStatusClass(statusValue);
  
    return `<span class="status-badge ${statusClass}">${statusText}</span>`;
  }
},
{ 
  key: 'sourceSystem',
  label: 'Source',
  sortable: true,
  format: (rowData: any) => {
        const css = rowData.sourceSystem === 'TMS' ? 'badge-blue' : 'badge-red';
    return `<span class="badge ${css}">${rowData.sourceSystem}</span>`;
  }
}

,
    { 
      key: 'createdDate', 
      label: 'Date création',
      sortable: true,
      format: (value: string | Date) => this.formatDate(value)
    },
    { 
      key: 'priority', 
      label: 'Priorité',
      sortable: true
    
    },
  {
    key: 'Action',
    format: (row: any) => ["Modifier", "Supprimer"]
  }
  ];

  get allOrdersCount(): number {
    return this.pagedOrderData?.totalData || 0;
  }

  get pendingOrdersCount(): number {
    if (!this.pagedOrderData?.data?.length) return 0;
    return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Pending).length;
  }

  get inProgressOrdersCount(): number {
    if (!this.pagedOrderData?.data?.length) return 0;
    return this.pagedOrderData.data.filter(o => o.status === OrderStatus.InProgress).length;
  }

  get completedOrdersCount(): number {
    if (!this.pagedOrderData?.data?.length) return 0;
    return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Delivered).length;
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
      
      const dataArray = result?.data?.data || [];
      const totalCount = result?.data?.totalData || 0;
      console.log('dd'+dataArray)
      
      // Process the data
      const processedData = dataArray.map((order: any) => {
           console.log('dd'+order.sourceSystem )
        // Convert string status to enum
        let orderStatus: OrderStatus;
        switch (order.status) {
          case 'Pending':
            orderStatus = OrderStatus.Pending;
            break;
          case 'InProgress':
            orderStatus = OrderStatus.InProgress;
            break;
          case 'Delivered':
            orderStatus = OrderStatus.Delivered;
            break;
          case 'Cancelled':
            orderStatus = OrderStatus.Cancelled;
            break;
          default:
            orderStatus = OrderStatus.Pending; 
        }
        
        return {
          ...order,
          status: orderStatus, 
          customerName: order.customerName || 'Non spécifié',
          customerMatricule: order.customerMatricule || '',
          priority: order.priority || 5, // Default to 5 if 0
          createdDate: order.createdDate || new Date().toISOString(),
          sourceSystem: order.sourceSystem || 'TMS' 
        };
      });
      
      this.pagedOrderData = {
        data: processedData,
        totalData: totalCount
      };
      
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

getStatusText(status: any): string {
  
  
  const statusStr = String(status).trim();
  
  if (statusStr === 'completed' || statusStr === 'delivered') {
    return 'Terminée';
  }
  if (statusStr === 'pending') {
    return 'En attente';
  }
  if (statusStr === 'inProgress') {
    return 'En cours';
  }
  if (statusStr === 'cancelled') {
    return 'Annulée';
  }
  

  return statusStr;
}

getStatusClass(status: any): string {
  
  
  
  const statusStr = String(status).trim();
  
 
  if (statusStr === 'completed' || statusStr === 'terminée' || statusStr === 'delivered') {
    return 'status-completed';
  }
  if (statusStr === 'pending' || statusStr === 'en attente') {
    return 'status-pending';
  }
  if (statusStr === 'inProgress' || statusStr === 'en cours') {
    return 'status-in-progress';
  }
  if (statusStr === 'cancelled' || statusStr === 'annulée') {
    return 'status-cancelled';
  }
  
  console.warn('Unknown status:', statusStr);
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
}