import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ITruck } from '../../types/truck';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common'; 
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
import { Auth } from '../../services/auth';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
@Component({
  selector: 'app-truck',
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
    MatFormFieldModule
  ],
  templateUrl: './truck.html',
  styleUrls: ['./truck.scss']
})
export class Truck implements OnInit {
  httpService = inject(Http);
  authService = inject(Auth);
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

   {
  key: 'status',
  label: 'Status',
  format: (row: any) => {
    let color = '#6b7280';
    let bg = '#f3f4f6';

    switch (row.status) {
      case 'Disponible':
        color = '#16a34a';
        bg = '#dcfce7';
        break;
      case 'En mission':
        color = '#2563eb';
        bg = '#dbeafe';
        break;
      case 'En panne':
        color = '#dc2626';
        bg = '#fee2e2';
        break;
    }

    return this.sanitizer.bypassSecurityTrustHtml(`
      <span class="status-pill"
        style="
          color: ${color};
          background-color: ${bg};
          border: 1px solid ${color}33;
        ">
        ${row.status}
      </span>
    `);
  },
  html: true
}

,
    {
  key: 'color',
  label: 'Couleur',
  format: (row: ITruck) => row.color 
}

,{
  key: 'imageBase64',
  label: 'Photo',
  format: (row: ITruck) => this.getImage(row.imageBase64)

},

    {
  key: 'Action',
  format: () => {
    const actions: string[] = [];

   
      actions.push('Modifier');
    

  
      actions.push('Supprimer');
    

    return actions;
  }
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

  exportCSV() {
    const rows = this.pagedTruckData?.data || [];

    const escape = (v: any) => {
      if (v === null || v === undefined) return '""';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvContent = [
      ['ID', 'Immatriculation', 'Marque', 'Capacité (T)', 'Date Visite', 'Status', 'Couleur'],
      ...rows.map(r => [
        r.id,
        r.immatriculation,
        r.brand,
        r.capacity,
        r.technicalVisitDate ? new Date(r.technicalVisitDate).toLocaleDateString('fr-FR') : '',
        r.status,
        r.color
      ])
    ]
      .map(row => row.map(escape).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'camions.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedTruckData?.data || [];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { Camions: worksheet },
      SheetNames: ['Camions']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'camions.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();

    const rows = this.pagedTruckData?.data || [];

    autoTable(doc, {
      head: [['ID', 'Immatriculation', 'Marque', 'Capacité (T)', 'Date Visite', 'Status', 'Couleur']],
      body: rows.map(r => [
        r.id,
        r.immatriculation,
        r.brand,
        r.capacity,
        r.technicalVisitDate ? new Date(r.technicalVisitDate).toLocaleDateString('fr-FR') : '',
        r.status,
        r.color
      ])
    });

    doc.save('camions.pdf');
  }

  getImage(base64?: string | null): SafeHtml {
  if (!base64) {
    return this.sanitizer.bypassSecurityTrustHtml(`
      <span style="color:#999">—</span>
    `);
  }

  return this.sanitizer.bypassSecurityTrustHtml(`
    <img 
      src="data:image/jpeg;base64,${base64}" 
      style="width:60px;height:40px;object-fit:cover;border-radius:4px"
    />
  `);
}
}
