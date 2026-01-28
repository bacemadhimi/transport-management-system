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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Translation } from '../../services/Translation';

@Component({
  selector: 'app-driver',
  standalone: true,
  imports: [
    Table,
    CommonModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule
  ],
  templateUrl: './driver.html',
  styleUrls: ['./driver.scss']
})
export class Driver implements OnInit {
  constructor(public auth: Auth) {}
  private translation = inject(Translation);
  t(key:string):string { return this.translation.t(key); }

  httpService = inject(Http);
  pagedDriverData!: PagedData<IDriver>;
  totalData!: number;
  router = inject(Router);
  readonly dialog = inject(MatDialog);

  filter: any = { pageIndex: 0, pageSize: 10 };
  searchControl = new FormControl('');
  showDisabled: boolean = false;

  // showCols = [
  //   { key: 'name', label: 'Nom' },
  //   { key: 'email', label: 'Email' },
  //   { key: 'permisNumber', label: 'Numéro Permis' },
  //   { key: 'phone', label: 'Téléphone' },
  //   { key: 'status', label: 'Status' },
  //   {
  //     key: 'Action',
  //     format: (row: IDriver) => row.isEnable ? ["Modifier", "Désactiver"] : ["Modifier", "Activer"]
  //   }
  // ];

  //I ADD THIS CODE FOR THE TRANSLATE LANGUAGE
showCols = [
  { key: 'name', label: this.t('TABLE_NAME') },
  { key: 'email', label: this.t('TABLE_EMAIL') },
  { key: 'permisNumber', label: this.t('TABLE_LICENSE_NUMBER') },
  { key: 'phone', label: this.t('TABLE_PHONE') },
  { key: 'status', label: this.t('TABLE_STATUS') },
  {
    key: 'Action',
    format: (row: IDriver) =>
      row.isEnable
        ? [this.t('ACTION_EDIT'), this.t('ACTION_DISABLE')]
        : [this.t('ACTION_EDIT'), this.t('ACTION_ENABLE')]
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

  toggleListe(checked: boolean) {
    this.showDisabled = checked;
    if (checked) this.loadDisabledDrivers();
    else this.loadActiveDrivers();
  }

  loadActiveDrivers() {
    this.httpService.getDriversList(this.filter).subscribe(result => {
      this.pagedDriverData = result;
      this.totalData = result.totalData;
    });
  }

  loadDisabledDrivers() {
    this.httpService.getdisableDriver(this.filter).subscribe(result => {
      this.pagedDriverData = result;
      this.totalData = result.totalData;
    });
  }

  add() { this.openDialog(); }

  edit(driver: IDriver) {
    const ref = this.dialog.open(DriverForm, { panelClass: 'm-auto', data: { driverId: driver.id } });
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

  openDialog() {
    const ref = this.dialog.open(DriverForm, { panelClass: 'm-auto', data: {} });
    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  // onRowClick(event: any) {
  //   const driver: IDriver = event.rowData;
  //   if (event.btn === "Modifier") this.edit(driver);
  //   if (event.btn === "Activer") this.enable(driver);
  //   if (event.btn === "Désactiver" && !this.showDisabled) this.disable(driver);
  // }

  // I MODIFY THIS CODE FOR THE TRANSLATE LANGUAGE
onRowClick(event: any) {
  const driver: IDriver = event.rowData;
  const btnLabel = event.btn; // plain string now

  if (btnLabel === this.t('ACTION_EDIT')) this.edit(driver);
  if (btnLabel === this.t('ACTION_ENABLE')) this.enable(driver);
  if (btnLabel === this.t('ACTION_DISABLE') && !this.showDisabled) this.disable(driver);
}



  // enable(driver: IDriver) {
  //   if (confirm(`Voulez-vous vraiment activer le chauffeur ${driver.name}?`)) {
  //     this.httpService.enableDriver(driver.id).subscribe(() => {
  //       alert("Chauffeur activé avec succès");
  //       this.showDisabled = false;
  //       this.loadActiveDrivers();
  //     });
  //   }
  // }
  //TRANSLATE LANGUAGE 
   enable(driver: IDriver) {
  if (confirm(this.t('CONFIRM_ENABLE_DRIVER').replace('{{name}}', driver.name))) {
    this.httpService.enableDriver(driver.id).subscribe(() => {
      alert(this.t('SUCCESS_DRIVER_ENABLED'));
      this.showDisabled = false;
      this.loadActiveDrivers();
    });
  }
}

  // disable(driver: IDriver) {
  //   if (confirm(`Voulez-vous vraiment désactiver le chauffeur ${driver.name}?`)) {
  //     this.httpService.disableDriver(driver.id).subscribe(() => {
  //       alert("Chauffeur désactivé avec succès");
  //       this.getLatestData();
  //     });
  //   }
  // }
  //TRANSLATE LANGUAGE
  disable(driver: IDriver) {
  if (confirm(this.t('CONFIRM_DISABLE_DRIVER').replace('{{name}}', driver.name))) {
    this.httpService.disableDriver(driver.id).subscribe(() => {
      alert(this.t('SUCCESS_DRIVER_DISABLED'));
      this.getLatestData();
    });
  }
}


  exportCSV() {
    const rows = this.pagedDriverData?.data || [];
    const csvContent = [
      ['ID', 'Nom', 'Permis', 'Téléphone', 'Status'],
      ...rows.map(d => [d.id, d.name, d.permisNumber, d.phone, d.status])
    ].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'chauffeurs.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedDriverData?.data || [];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = { Sheets: { Chauffeurs: worksheet }, SheetNames: ['Chauffeurs'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'chauffeurs.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows = this.pagedDriverData?.data || [];
    autoTable(doc, {
      head: [['ID', 'Nom', 'Permis', 'Téléphone', 'Status']],
      body: rows.map(d => [d.id, d.name, d.permisNumber, d.phone, d.status])
    });
    doc.save('chauffeurs.pdf');
  }
}
