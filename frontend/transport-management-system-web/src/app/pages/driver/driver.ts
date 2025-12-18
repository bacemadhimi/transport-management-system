import { Component, OnInit, inject } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';

import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DriverForm } from './driver-form/driver-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { IDriver } from '../../types/driver';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-driver',
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
  templateUrl: './driver.html',
  styleUrls: ['./driver.scss']
})
export class Driver implements OnInit {
  httpService = inject(Http);
  pagedDriverData!: PagedData<IDriver>;
  totalData!: number;

  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };

  searchControl = new FormControl('');
  router = inject(Router);
  readonly dialog = inject(MatDialog);

  showCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nom' },
    { key: 'permisNumber', label: 'Numéro Permis' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'status', label: 'Status' },
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
    this.httpService.getDriversList(this.filter).subscribe(result => {
      this.pagedDriverData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(driver: IDriver) {
    const ref = this.dialog.open(DriverForm, {
      panelClass: 'm-auto',
      data: { driverId: driver.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(driver: IDriver) {
    if (confirm(`Voulez-vous vraiment supprimer le chauffeur ${driver.name}?`)) {
      this.httpService.deleteDriver(driver.id).subscribe(() => {
        alert("Chauffeur supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(DriverForm, {
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
  const rows = this.pagedDriverData?.data || [];

  const csvContent = [
    ['ID', 'Nom', 'Permis', 'Téléphone', 'Status'],
    ...rows.map(d => [
      d.id,
      d.name,
      d.permisNumber,
      d.phone,
      d.status
    ])
  ]
    .map(e => e.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'chauffeurs.csv';
  link.click();
}
exportExcel() {
  const data = this.pagedDriverData?.data || [];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = {
    Sheets: { Chauffeurs: worksheet },
    SheetNames: ['Chauffeurs']
  };

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream'
  });

  saveAs(blob, 'chauffeurs.xlsx');
}


exportPDF() {
  const doc = new jsPDF();

  const rows = this.pagedDriverData?.data || [];

  autoTable(doc, {
    head: [['ID', 'Nom', 'Permis', 'Téléphone', 'Status']],
    body: rows.map(d => [
      d.id,
      d.name,
      d.permisNumber,
      d.phone,
      d.status
    ])
  });

  doc.save('chauffeurs.pdf');
}

}
