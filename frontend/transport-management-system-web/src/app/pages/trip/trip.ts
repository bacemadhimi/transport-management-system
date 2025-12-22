import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ITrip } from '../../types/trip'; 
import { MatButtonModule } from '@angular/material/button';
import {  FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { TripTypeOptions, TripStatusOptions } from '../../types/trip';
import { TripFormComponent } from './trip-form/trip-form';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-trip',
  standalone: true,
  imports: [
    Table,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './trip.html',
  styleUrls: ['./trip.scss']
})
export class Trip implements OnInit {
   private sanitizer = inject(DomSanitizer);
  httpService = inject(Http);
  pagedTripData!: PagedData<ITrip>;
  enrichedTripData: any[] = [];
  totalData!: number;
  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };
  searchControl = new FormControl('');
  router = inject(Router);
  readonly dialog = inject(MatDialog);

  showCols = [
  { 
    key: 'id',
    label: 'Id'
  },
  { 
    key: 'bookingId',
    label: 'Booking ID'
  },
  { 
    key: 'vehicleDriver', 
    label: 'Vehicle & Driver',
    format: (row: any): SafeHtml => {
      const truck = row.truck;
      const driver = row.driver;

      const vehicleInfo = truck ? `${truck.brand} - ${truck.immatriculation}` : `Truck #${truck?.name}`;
      const driverInfo = driver ? driver.name : `Driver #${row.driverId}`;

      return this.sanitizer.bypassSecurityTrustHtml(`
        <div style="font-weight: 500;">
          <div style="margin-bottom: 4px;">
            <span style="color:#666; font-size:12px; font-weight:bold;">Vehicle: </span>
            <span>${vehicleInfo}</span>
          </div>
          <div>
            <span style="color:#666; font-size:12px; font-weight:bold;">Driver: </span>
            <span>${driverInfo}</span>
          </div>
        </div>
      `);
    },
    html: true
  },
  { 
    key: 'dates', 
    label: 'Date',
    format: (row: any): SafeHtml => {
      const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
          const date = new Date(dateString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
         
          return `${year}-${month}-${day}`;
        } catch {
          return 'Invalid date';
        }
      };

      return this.sanitizer.bypassSecurityTrustHtml(`
        <div style="font-weight: 500;">
          <div style="margin-bottom: 4px;">
            <span style="color:#666; font-size:12px; font-weight:bold;">Start: </span>
            <span>${formatDateTime(row.tripStartDate)}</span>
          </div>
          <div>
            <span style="color:#666; font-size:12px; font-weight:bold;">End: </span>
            <span>${formatDateTime(row.tripEndDate)}</span>
          </div>
        </div>
      `);
    },
    html: true
  },
  { 
    key: 'route', 
    label: 'Trip Route',
    format: (row: any): SafeHtml => {
      return this.sanitizer.bypassSecurityTrustHtml(`
        <div style="font-weight: 500;">
          <div style="margin-bottom: 4px;">
            <span style="color:#666; font-size:12px; font-weight:bold;">From: </span>
            <span>${row.tripStartLocation || 'N/A'}</span>
          </div>
          <div>
            <span style="color:#666; font-size:12px; font-weight:bold;">To: </span>
            <span>${row.tripEndLocation || 'N/A'}</span>
          </div>
        </div>
      `);
    },
    html: true
  },
  { 
    key: 'distanceInfo',
    label: 'Distance',
    format: (row: any): SafeHtml => {
      return this.sanitizer.bypassSecurityTrustHtml(`
        <div style="font-weight: 500;">
          <div>
            <span>${row.approxTotalKM ? `${row.approxTotalKM} km` : 'N/A'}</span>
          </div>
        </div>
      `);
    },
    html: true
  },
  { 
    key: 'tripType',
    label: 'Type',
    format: (row: any): SafeHtml => {
      const tripType = TripTypeOptions.find(t => t.value === row.tripType);
      const typeLabel = tripType ? tripType.label : row.tripType;

      let icon = '🚚';
      let color = '#007bff';

      if (row.tripType === 'RoundTrip') {
        icon = '🔄';
        color = '#28a745';
      } else if (row.tripType === 'SingleTrip') {
        icon = '→';
        color = '#17a2b8';
      }

      return this.sanitizer.bypassSecurityTrustHtml(`
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 16px;">${icon}</span>
          <span style="color: ${color}; font-weight: 500;">${typeLabel}</span>
        </div>
      `);
    },
    html: true
  },
  { 
    key: 'tripStatus', 
    label: 'Status',
    format: (row: any): SafeHtml => {
      const tripStatus = TripStatusOptions.find(t => t.value === row.tripStatus);
      const status = tripStatus ? tripStatus.label : row.tripStatus || 'N/A';

      let color = '#6c757d';
      let bgColor = '#f8f9fa';

      switch(row.tripStatus) {
        case 'Completed':
          color = '#28a745';
          bgColor = '#d4edda';
          break;
        case 'TripStarted':
        case 'Loading':
        case 'InTransit':
        case 'Unloading':
          color = '#ffc107';
          bgColor = '#fff3cd';
          break;
        case 'Booked':
        case 'YetToStart':
        case 'AcceptedByDriver':
          color = '#17a2b8';
          bgColor = '#d1ecf1';
          break;
        case 'TripCancelled':
        case 'RejectedByDriver':
          color = '#dc3545';
          bgColor = '#f8d7da';
          break;
        case 'ArrivedToDestination':
          color = '#6610f2';
          bgColor = '#e0d6ff';
          break;
      }

      return this.sanitizer.bypassSecurityTrustHtml(`
        <span style="
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          color: ${color};
          background-color: ${bgColor};
          border: 1px solid ${color}20;
          white-space: nowrap;
        ">
          ${status}
        </span>
      `);
    },
    html: true
  },
  { 
    key: 'customerInfo', 
    label: 'Client',
    format: (row: any) => row.customerDetails?.name || row.customer?.name || `Client #${row.customerId}`
  },
  {
    key: 'Action',
    format: (row: any) => ["Modifier", "Supprimer"]
  }
];


  ngOnInit() {
    this.getLatestData();

    this.searchControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: string | null) => {
        this.filter.search = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
  }

  getLatestData() {
    this.httpService.getTripsList(this.filter).subscribe(result => {
        this.pagedTripData = result;
        this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(trip: any) {
    const ref = this.dialog.open(TripFormComponent, {
      panelClass: 'm-auto',
      data: { tripId: trip.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(trip: any) {
    const customerName = trip.customerDetails?.name || trip.customer?.name || `Client #${trip.customerId}`;
    
    if (confirm(`Voulez-vous vraiment supprimer le voyage pour ${customerName}?`)) {
      this.httpService.deleteTrip(trip.id).subscribe(() => {
        alert("Voyage supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(TripFormComponent, {
      panelClass: 'm-auto',
      data: {}
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  onRowClick(event: any) {
    if (event.btn === "Modifier") this.edit(event.rowData);
    if (event.btn === "Supprimer") this.delete(event.rowData);
  }

  exportCSV() {
    const rows: ITrip[] = this.pagedTripData?.data || [];

    const csvContent = [
      ['ID', 'Booking ID', 'Vehicle', 'Driver', 'Start Date', 'End Date', 'From', 'To', 'Status'],
      ...rows.map(d => [
        d.id ?? '',
        d.bookingId ?? '',
        d.truck ? `${d.truck.brand || ''} - ${d.truck.immatriculation || ''}` : '',
        d.driver?.name ?? '',
        d.tripStartDate ?? '',
        d.tripEndDate ?? '',
        d.tripStartLocation ?? '',
        d.tripEndLocation ?? '',
        d.tripStatus ?? ''
      ])
    ]
      .map(e => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'voyages.csv';
    link.click();
  }

  exportExcel() {
    const data: ITrip[] = this.pagedTripData?.data || [];

    const excelData = data.map(d => ({
      ID: d.id ?? '',
      'Booking ID': d.bookingId ?? '',
      Vehicle: d.truck ? `${d.truck.brand || ''} - ${d.truck.immatriculation || ''}` : '',
      Driver: d.driver?.name ?? '',
      'Start Date': d.tripStartDate ?? '',
      'End Date': d.tripEndDate ?? '',
      From: d.tripStartLocation ?? '',
      To: d.tripEndLocation ?? '',
      Status: d.tripStatus ?? ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = {
      Sheets: { Voyages: worksheet },
      SheetNames: ['Voyages']
    } as any;

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(blob, 'voyages.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows: ITrip[] = this.pagedTripData?.data || [];

    autoTable(doc, {
      head: [[ 'ID', 'Booking ID', 'Vehicle', 'Driver', 'Start Date', 'End Date', 'From', 'To', 'Status' ]],
      body: rows.map(d => [
        d.id ?? '',
        d.bookingId ?? '',
        d.truck ? `${d.truck.brand || ''} - ${d.truck.immatriculation || ''}` : '',
        d.driver?.name ?? '',
        d.tripStartDate ?? '',
        d.tripEndDate ?? '',
        d.tripStartLocation ?? '',
        d.tripEndLocation ?? '',
        d.tripStatus ?? ''
      ])
    });

    doc.save('voyages.pdf');
  }
}