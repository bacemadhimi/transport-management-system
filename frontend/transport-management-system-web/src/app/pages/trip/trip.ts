// trip.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ITrip } from '../../types/trip';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { TripTypeOptions, TripStatusOptions } from '../../types/trip';
import { TripFormComponent } from './trip-form/trip-form';

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
  private sanitizer = inject(DomSanitizer);

  showCols = [
    { key: 'id', label: 'ID' },
    { 
    key: 'customer', 
    label: 'Client',
    format: (row: ITrip) => {
      // If customer navigation property is loaded
      if (row.customer) {
        return row.customer.name;
      }
      
      return `Client #${row.customerId}`;
    }
  },
    { 
      key: 'tripStartDate', 
      label: 'Date Début',
      format: (row: ITrip) => {
        if (!row.tripStartDate) return '';
        const date = new Date(row.tripStartDate);
        return date.toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric'
        });
      }
    },
    { 
      key: 'tripEndDate', 
      label: 'Date Fin',
      format: (row: ITrip) => {
        if (!row.tripEndDate) return '';
        const date = new Date(row.tripEndDate);
        return date.toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric'
        });
      }
    },
    { 
      key: 'tripType', 
      label: 'Type',
      format: (row: ITrip) => {
        const tripType = TripTypeOptions.find(t => t.value === row.tripType);
        return tripType ? tripType.label : row.tripType;
      }
    },
    { 
      key: 'tripStatus', 
      label: 'Statut',
      format: (row: ITrip) => {
        const tripStatus = TripStatusOptions.find(t => t.value === row.tripStatus);
        return tripStatus ? tripStatus.label : row.tripStatus;
      }
    },
    { key: 'tripStartLocation', label: 'Départ' },
    { key: 'tripEndLocation', label: 'Arrivée' },
    { 
      key: 'approxTotalKM', 
      label: 'Distance (km)',
      format: (row: ITrip) => row.approxTotalKM ? `${row.approxTotalKM} km` : '-'
    },
    { 
      key: 'startKmsReading', 
      label: 'KM Départ',
      format: (row: ITrip) => `${row.startKmsReading} km`
    },
    {
      key: 'Action',
      format: () => ["Modifier", "Supprimer"]
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

  edit(trip: ITrip) {
    const ref = this.dialog.open(TripFormComponent, {
      panelClass: 'm-auto',
      data: { tripId: trip.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(trip: ITrip) {
  const customerName = trip.customer?.name || `Client #${trip.customerId}`;
  
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
}