import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { IUserGroup } from '../../types/user-group';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { UserGroupForm } from './user-group-form/user-group-form';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-user-group',
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
  templateUrl: './user-group.html',
  styleUrls: ['./user-group.scss']
})
export class UserGroup implements OnInit {
  httpService = inject(Http);
  pagedUserGroupData!: PagedData<IUserGroup>;
  totalData!: number;
  
  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };
  
  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  showCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nom du Groupe' },
    { 
      key: 'createdAt', 
      label: 'Date de création',
      format: (row: IUserGroup) => {
        if (!row.createdAt) return '';
        const date = new Date(row.createdAt);
        return date.toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric'
        });
      }
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
    this.httpService.getUserGroupsList(this.filter).subscribe(result => {
      this.pagedUserGroupData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(group: IUserGroup) {
    const ref = this.dialog.open(UserGroupForm, {
      panelClass: 'm-auto',
      width: '500px',
      data: { groupId: group.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(group: IUserGroup) {
    if (confirm(`Voulez-vous vraiment supprimer le groupe "${group.name}"?`)) {
      this.httpService.deleteUserGroup(group.id).subscribe(() => {
        alert("Groupe supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(UserGroupForm, {
      panelClass: 'm-auto',
      width: '500px',
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
    const rows = this.pagedUserGroupData?.data || [];

    const escape = (v: any) => {
      if (v === null || v === undefined) return '""';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvContent = [
      ['ID', 'Nom du Groupe', 'Date de création'],
      ...rows.map(r => [
        r.id, 
        r.name,
        r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : ''
      ])
    ]
      .map(row => row.map(escape).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'groupes_utilisateurs.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedUserGroupData?.data || [];

    const formattedData = data.map(r => ({
      'ID': r.id,
      'Nom du Groupe': r.name,
      'Date de création': r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = {
      Sheets: { 'Groupes Utilisateurs': worksheet },
      SheetNames: ['Groupes Utilisateurs']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, 'groupes_utilisateurs.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();

    const rows = this.pagedUserGroupData?.data || [];

    autoTable(doc, {
      head: [['ID', 'Nom du Groupe', 'Date de création']],
      body: rows.map(r => [
        r.id, 
        r.name,
        r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : ''
      ])
    });

    doc.save('groupes_utilisateurs.pdf');
  }
}