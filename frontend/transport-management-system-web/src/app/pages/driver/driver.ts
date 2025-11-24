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
console.log(this.pagedDriverData);
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
}
