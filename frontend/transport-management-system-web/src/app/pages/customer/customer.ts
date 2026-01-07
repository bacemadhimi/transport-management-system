import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ICustomer } from '../../types/customer';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { CustomerFormComponent } from './customer-form/customer-form';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-customers',
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
  templateUrl: './customer.html',
  styleUrls: ['./customer.scss']
})
export class Customer implements OnInit {
  httpService = inject(Http);
  pagedCustomerData!: PagedData<ICustomer>;
  totalData!: number;
  
  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };
  
  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  showCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nom' },
    { key: 'matricule', label: 'Matricule' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'email', label: 'Email' },
    { 
      key: 'adress', 
      label: 'Adresse',
      format: (row: ICustomer) => row.adress || 'N/A'
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
    this.httpService.getCustomersList(this.filter).subscribe(result => {
      this.pagedCustomerData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(customer: ICustomer) {
    const ref = this.dialog.open(CustomerFormComponent, {
      panelClass: 'm-auto',
      data: { customerId: customer.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(customer: ICustomer) {
    if (confirm(`Voulez-vous vraiment supprimer le client ${customer.name}?`)) {
      this.httpService.deleteCustomer(customer.id).subscribe(() => {
        alert("Client supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(CustomerFormComponent, {
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
    const rows = this.pagedCustomerData?.data || [];

    const csvContent = [
      ['ID', 'Nom', 'Téléphone', 'Email', 'Adresse'],
      ...rows.map(d => [d.id, d.name, d.phone, d.email, d.adress])
    ]
      .map(e => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'clients.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedCustomerData?.data || [];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { Clients: worksheet },
      SheetNames: ['Clients']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(blob, 'clients.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows = this.pagedCustomerData?.data || [];

    autoTable(doc, {
      head: [['ID', 'Nom', 'Téléphone', 'Email', 'Adresse']],
      body: rows.map(d => [d.id ?? '', d.name ?? '', d.phone ?? '', d.email ?? '', d.adress ?? ''])
    });

    doc.save('clients.pdf');
  }
}