import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ITrip, TripStatusOptions } from '../../types/trip'; 
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { TripForm } from './trip-form/trip-form';
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
  totalData!: number;
  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };
  searchControl = new FormControl('');
  router = inject(Router);
  readonly dialog = inject(MatDialog);

  // Options de statut
  tripStatuses = TripStatusOptions;

  showCols = [
    { 
      key: 'id',
      label: 'ID'
    },
    { 
      key: 'bookingId',
      label: 'Référence'
    },
    { 
      key: 'tripReference',
      label: 'Référence métier'
    },
    { 
      key: 'vehicleDriver', 
      label: 'Camion & Chauffeur',
      format: (row: any): SafeHtml => {
        const truck = row.truck;
        const driver = row.driver;

        const vehicleInfo = truck ? `${truck.immatriculation}` : `Camion #${row.truckId}`;
        const driverInfo = driver ? driver.name : `Chauffeur #${row.driverId}`;

        return this.sanitizer.bypassSecurityTrustHtml(`
          <div>
            <div style="margin-bottom: 4px;">
              <span style="color:#666; font-size:12px;">Camion: </span>
              <span style="font-weight:500;">${vehicleInfo}</span>
            </div>
            <div>
              <span style="color:#666; font-size:12px;">Chauffeur: </span>
              <span style="font-weight:500;">${driverInfo}</span>
            </div>
          </div>
        `);
      },
      html: true
    },
    { 
      key: 'deliveriesInfo',
      label: 'Livraisons',
      format: (row: any): SafeHtml => {
        const deliveryCount = row.deliveries?.length || 0;
        const completedDeliveries = row.deliveries?.filter((d: any) => 
          d.status === 'Delivered'
        ).length || 0;
        
        return this.sanitizer.bypassSecurityTrustHtml(`
          <div>
            <div style="margin-bottom: 4px;">
              <span style="color:#666; font-size:12px;">Total: </span>
              <span style="font-weight:500;">${deliveryCount}</span>
            </div>
            <div>
              <span style="color:#666; font-size:12px;">Livrées: </span>
              <span style="font-weight:500; color: ${completedDeliveries === deliveryCount ? '#28a745' : '#ffc107'}">
                ${completedDeliveries}
              </span>
            </div>
          </div>
        `);
      },
      html: true
    },
    { 
      key: 'dates', 
      label: 'Dates estimées',
      format: (row: any): SafeHtml => {
        const formatDate = (dateString: string) => {
          if (!dateString) return 'N/A';
          try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR');
          } catch {
            return 'Date invalide';
          }
        };

        return this.sanitizer.bypassSecurityTrustHtml(`
          <div>
            <div style="margin-bottom: 4px;">
              <span style="color:#666; font-size:12px;">Début: </span>
              <span>${formatDate(row.estimatedStartDate)}</span>
            </div>
            <div>
              <span style="color:#666; font-size:12px;">Fin: </span>
              <span>${formatDate(row.estimatedEndDate)}</span>
            </div>
          </div>
        `);
      },
      html: true
    },
    { 
      key: 'distanceDuration',
      label: 'Distance & Durée',
      format: (row: any): SafeHtml => {
        return this.sanitizer.bypassSecurityTrustHtml(`
          <div>
            <div style="margin-bottom: 4px;">
              <span style="color:#666; font-size:12px;">Distance: </span>
              <span style="font-weight:500;">${row.estimatedDistance || 0} km</span>
            </div>
            <div>
              <span style="color:#666; font-size:12px;">Durée: </span>
              <span style="font-weight:500;">${row.estimatedDuration || 0} h</span>
            </div>
          </div>
        `);
      },
      html: true
    },
    { 
      key: 'tripStatus', 
      label: 'Statut',
      format: (row: any): SafeHtml => {
        const tripStatus = this.tripStatuses.find(t => t.value === row.tripStatus);
        const status = tripStatus ? tripStatus.label : row.tripStatus || 'N/A';

        let color = '#6c757d';
        let bgColor = '#f8f9fa';
        let icon = '';

        switch(row.tripStatus) {
          case 'Completed':
            color = '#28a745';
            bgColor = '#d4edda';
            icon = '✅';
            break;
          case 'InProgress':
            color = '#007bff';
            bgColor = '#cce5ff';
            icon = '🚚';
            break;
          case 'Planned':
            color = '#ffc107';
            bgColor = '#fff3cd';
            icon = '📅';
            break;
          case 'Delayed':
            color = '#fd7e14';
            bgColor = '#ffe5d0';
            icon = '⏰';
            break;
          case 'Cancelled':
            color = '#dc3545';
            bgColor = '#f8d7da';
            icon = '❌';
            break;
        }

        return this.sanitizer.bypassSecurityTrustHtml(`
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 14px;">${icon}</span>
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
          </div>
        `);
      },
      html: true
    },
    {
      key: 'Action',
      format: (row: any) => ["Modifier", "Supprimer", "Voir détails"]
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
    this.httpService.getTripsList(this.filter).subscribe({
      next: (result) => {
        this.pagedTripData = result;
        this.totalData = result.totalData;
      },
      error: (error) => {
        console.error('Error loading trips:', error);
        alert('Erreur lors du chargement des voyages');
      }
    });
  }

  add() {
    this.openDialog();
  }

  edit(trip: any) {
    const ref = this.dialog.open(TripForm, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['dialog-overlay', 'wide-dialog'],
      data: { tripId: trip.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(trip: any) {
    const confirmation = confirm(`Voulez-vous vraiment supprimer le voyage ${trip.bookingId} ?`);
    
    if (confirmation) {
      this.httpService.deleteTrip(trip.id).subscribe({
        next: () => {
          alert("Voyage supprimé avec succès");
          this.getLatestData();
        },
        error: (error) => {
          console.error('Error deleting trip:', error);
          alert("Erreur lors de la suppression du voyage");
        }
      });
    }
  }

  viewDetails(trip: any) {
    // Navigation vers la page de détails du voyage
    this.router.navigate(['/trips', trip.id]);
  }

  openDialog(): void {
    const ref = this.dialog.open(TripForm, {
      width: '900px', 
      maxWidth: '95vw', 
      maxHeight: '90vh', 
      panelClass: ['dialog-overlay', 'wide-dialog'], 
      data: {}
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  onRowClick(event: any) {
    switch(event.btn) {
      case "Modifier":
        this.edit(event.rowData);
        break;
      case "Supprimer":
        this.delete(event.rowData);
        break;
      case "Voir détails":
        this.viewDetails(event.rowData);
        break;
    }
  }

  exportCSV() {
    const rows: ITrip[] = this.pagedTripData?.data || [];

    const csvContent = [
      ['ID', 'Référence', 'Référence métier', 'Camion', 'Chauffeur', 'Début estimé', 'Fin estimée', 'Distance (km)', 'Durée (h)', 'Livraisons totales', 'Livraisons terminées', 'Statut'],
      ...rows.map(d => [
        d.id ?? '',
        d.bookingId ?? '',
        d.tripReference ?? '',
        d.truck ? `${d.truck.immatriculation}` : '',
        d.driver?.name ?? '',
        d.estimatedStartDate ?? '',
        d.estimatedEndDate ?? '',
        d.estimatedDistance ?? 0,
        d.estimatedDuration ?? 0,
        d.deliveries?.length ?? 0,
        d.deliveries?.filter(del => del.status === 'Delivered').length ?? 0,
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
      'Référence': d.bookingId ?? '',
      'Référence métier': d.tripReference ?? '',
      'Camion': d.truck ? d.truck.immatriculation : '',
      'Chauffeur': d.driver?.name ?? '',
      'Début estimé': d.estimatedStartDate ?? '',
      'Fin estimée': d.estimatedEndDate ?? '',
      'Distance (km)': d.estimatedDistance ?? 0,
      'Durée (h)': d.estimatedDuration ?? 0,
      'Livraisons totales': d.deliveries?.length ?? 0,
      'Livraisons terminées': d.deliveries?.filter(del => del.status === 'Delivered').length ?? 0,
      'Statut': d.tripStatus ?? ''
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
      head: [[
        'ID', 'Référence', 'Référence métier', 'Camion', 'Chauffeur', 
        'Début estimé', 'Fin estimée', 'Distance', 'Durée', 'Livraisons', 'Statut'
      ]],
      body: rows.map(d => [
        d.id ?? '',
        d.bookingId ?? '',
        d.tripReference ?? '',
        d.truck ? d.truck.immatriculation : '',
        d.driver?.name ?? '',
        d.estimatedStartDate ?? '',
        d.estimatedEndDate ?? '',
        `${d.estimatedDistance ?? 0} km`,
        `${d.estimatedDuration ?? 0} h`,
        `${d.deliveries?.length ?? 0} total / ${d.deliveries?.filter(del => del.status === 'Delivered').length ?? 0} terminées`,
        d.tripStatus ?? ''
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('voyages.pdf');
  }
}