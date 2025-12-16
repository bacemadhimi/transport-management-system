import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ITruck } from '../../types/truck';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TruckForm } from './truck-form/truck-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-truck',
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
  templateUrl: './truck.html',
  styleUrls: ['./truck.scss']
})
export class Truck implements OnInit {
  httpService = inject(Http);
  pagedTruckData!: PagedData<ITruck>;
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
    { key: 'immatriculation', label: 'Immatriculation' },
    { key: 'brand', label: 'Marque' },
    { key: 'capacity', label: 'Capacité (T)' },
   {
  key: 'technicalVisitDate',
  label: 'Date Visite',
  format: (row: ITruck) => {
    if (!row.technicalVisitDate) return '';
    const date = new Date(row.technicalVisitDate);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  }
  },

    { key: 'status', label: 'Status' },
    {
  key: 'color',
  label: 'Couleur',
  format: (row: ITruck) => row.color 
}


,
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
    this.httpService.getTrucksList(this.filter).subscribe(result => {
      this.pagedTruckData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(truck: ITruck) {
    const ref = this.dialog.open(TruckForm, {
      panelClass: 'm-auto',
      data: { truckId: truck.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(truck: ITruck) {
    if (confirm(`Voulez-vous vraiment supprimer le camion ${truck.immatriculation}?`)) {
      this.httpService.deleteTruck(truck.id).subscribe(() => {
        alert("Camion supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(TruckForm, {
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
