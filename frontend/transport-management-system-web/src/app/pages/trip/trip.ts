import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ITrip, TripStatus, TripStatusOptions } from '../../types/trip'; // Added TripStatus import
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
import { Auth } from '../../services/auth';

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
      constructor(public auth: Auth) {}  
    
      getActions(row: any, actions: string[]) {
        const permittedActions: string[] = [];
    
        for (const a of actions) {
          if (a === 'Modifier' && this.auth.hasPermission('TRAVEL_EDIT')) {
            permittedActions.push(a);
          }
          if (a === 'Supprimer' && this.auth.hasPermission('TRAVEL_DISABLE')) {
            permittedActions.push(a);
          }
        }
    
        return permittedActions;
      }
      
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

  tripStatuses = TripStatusOptions;

  showCols = [
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
        return this.sanitizer.bypassSecurityTrustHtml(`
          <div>
            <div style="margin-bottom: 4px;">
              <span style="color:#666; font-size:12px;">Camion: </span>
              <span style="font-weight:500;">${row.truck ?? 'N/A'}</span>
            </div>
            <div>
              <span style="color:#666; font-size:12px;">Chauffeur: </span>
              <span style="font-weight:500;">${row.driver ?? 'N/A'}</span>
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
        return this.sanitizer.bypassSecurityTrustHtml(`
          <div>
            <div style="margin-bottom: 4px;">
              <span style="color:#666; font-size:12px;">Total: </span>
              <span style="font-weight:500;">${row.deliveryCount ?? 0}</span>
            </div>
            <div>
              <span style="color:#666; font-size:12px;">Livrées: </span>
              <span style="font-weight:500; color: ${
                row.completedDeliveries === row.deliveryCount ? '#28a745' : '#ffc107'
              }">
                ${row.completedDeliveries ?? 0}
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
        let icon = '📋';

        switch(row.tripStatus) {
          case TripStatus.Planned:
            color = '#3b82f6'; // Blue
            bgColor = '#dbeafe';
            icon = '📅';
            break;
          case TripStatus.Accepted:
            color = '#10b981'; // Green
            bgColor = '#d1fae5';
            icon = '✅';
            break;
          case TripStatus.Loading:
            color = '#f59e0b'; // Amber
            bgColor = '#fef3c7';
            icon = '📦';
            break;
          case TripStatus.LoadingInProgress:
            color = '#f97316'; // Orange
            bgColor = '#ffedd5';
            icon = '🚚';
            break;
          case TripStatus.Delivery:
            color = '#8b5cf6'; // Purple
            bgColor = '#ede9fe';
            icon = '📦→';
            break;
          case TripStatus.DeliveryInProgress:
            color = '#6366f1'; // Indigo
            bgColor = '#e0e7ff';
            icon = '🚚';
            break;
          case TripStatus.Receipt:
            color = '#059669'; // Emerald
            bgColor = '#d1fae5';
            icon = '🏁';
            break;
          case TripStatus.Cancelled:
            color = '#dc2626'; // Red
            bgColor = '#fee2e2';
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
              min-width: 120px;
              text-align: center;
            ">
              ${status}
            </span>
          </div>
        `);
      },
      html: true
    },
    { 
      key: 'createdInfo',
      label: 'Création',
      format: (row: any): SafeHtml => {
        const formatDateTime = (dateString: string) => {
          if (!dateString) return 'N/A';
          try {
            const date = new Date(dateString);
            return date.toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          } catch {
            return 'Date invalide';
          }
        };

        return this.sanitizer.bypassSecurityTrustHtml(`
          <div>
            <div style="margin-bottom: 4px;">
              <span style="color:#666; font-size:11px;">Par: </span>
              <span style="font-weight:500;">${row.createdByName || row.createdBy || 'N/A'}</span>
            </div>
            <div>
              <span style="color:#666; font-size:11px;">Le: </span>
              <span>${formatDateTime(row.createdAt)}</span>
            </div>
          </div>
        `);
      },
      html: true
    },
    { 
      key: 'updatedInfo',
      label: 'Dernière modification',
      format: (row: any): SafeHtml => {
        const formatDateTime = (dateString: string) => {
          if (!dateString) return 'N/A';
          try {
            const date = new Date(dateString);
            return date.toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          } catch {
            return 'Date invalide';
          }
        };

        const displayName = row.updatedByName || row.updatedBy || 'N/A';
        const displayDate = formatDateTime(row.updatedAt);

        return this.sanitizer.bypassSecurityTrustHtml(`
          <div>
            <div style="margin-bottom: 4px;">
              <span style="color:#666; font-size:11px;">Par: </span>
              <span style="font-weight:500;">${displayName}</span>
            </div>
            <div>
              <span style="color:#666; font-size:11px;">Le: </span>
              <span>${displayDate}</span>
            </div>
          </div>
        `);
      },
      html: true
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
    const rows: any[] = this.pagedTripData?.data || [];

    const csvContent = [
      [
        'ID',
        'Référence',
        'Référence métier',
        'Camion',
        'Chauffeur',
        'Début estimé',
        'Fin estimée',
        'Distance (km)',
        'Durée (h)',
        'Livraisons totales',
        'Livraisons terminées',
        'Statut'
      ],
      ...rows.map(d => [
        d.id ?? '',
        d.bookingId ?? '',
        d.tripReference ?? '',
        d.truck ?? '',
        d.driver ?? '',
        d.estimatedStartDate
          ? new Date(d.estimatedStartDate).toLocaleString()
          : '',
        d.estimatedEndDate
          ? new Date(d.estimatedEndDate).toLocaleString()
          : '',
        d.estimatedDistance ?? 0,
        d.estimatedDuration ?? 0,
        d.deliveryCount ?? 0,
        d.completedDeliveries ?? 0,
        d.tripStatus ?? ''
      ])
    ]
      .map(row =>
        row
          .map(value => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'voyages.csv';
    link.click();
  }

  exportExcel() {
    const data: any[] = this.pagedTripData?.data || [];

    const excelData = data.map(d => ({
      ID: d.id ?? '',
      'Référence': d.bookingId ?? '',
      'Référence métier': d.tripReference ?? '',
      'Camion': d.truck ?? '',
      'Chauffeur': d.driver ?? '',
      'Début estimé': d.estimatedStartDate
        ? new Date(d.estimatedStartDate).toLocaleString()
        : '',
      'Fin estimée': d.estimatedEndDate
        ? new Date(d.estimatedEndDate).toLocaleString()
        : '',
      'Distance (km)': d.estimatedDistance ?? 0,
      'Durée (h)': d.estimatedDuration ?? 0,
      'Livraisons totales': d.deliveryCount ?? 0,
      'Livraisons terminées': d.completedDeliveries ?? 0,
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

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, 'voyages.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows: any[] = this.pagedTripData?.data || [];

    autoTable(doc, {
      head: [[
        'ID',
        'Référence',
        'Référence métier',
        'Camion',
        'Chauffeur',
        'Début estimé',
        'Fin estimée',
        'Distance',
        'Durée',
        'Livraisons',
        'Statut'
      ]],
      body: rows.map(d => [
        d.id ?? '',
        d.bookingId ?? '',
        d.tripReference ?? '',
        d.truck ?? '',
        d.driver ?? '',
        d.estimatedStartDate
          ? new Date(d.estimatedStartDate).toLocaleString()
          : '',
        d.estimatedEndDate
          ? new Date(d.estimatedEndDate).toLocaleString()
          : '',
        `${d.estimatedDistance ?? 0} km`,
        `${d.estimatedDuration ?? 0} h`,
        `${d.completedDeliveries ?? 0} / ${d.deliveryCount ?? 0}`,
        d.tripStatus ?? ''
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('voyages.pdf');
  }
}