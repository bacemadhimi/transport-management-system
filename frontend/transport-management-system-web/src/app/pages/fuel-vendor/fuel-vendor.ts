import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { IFuelVendor } from '../../types/fuel-vendor';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';

import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { FuelVendorForm } from './fuel-vendor-form/fuel-vendor-form';

@Component({
  selector: 'app-fuel-vendor',
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
  templateUrl: './fuel-vendor.html',
  styleUrls: ['./fuel-vendor.scss']
})
export class FuelVendor implements OnInit {
  httpService = inject(Http);
  pagedFuelVendorData!: PagedData<IFuelVendor>;
  totalData!: number;
  
  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };
  
  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  showCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nom du Fournisseur' },
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
    this.httpService.getFuelVendorsList(this.filter).subscribe(result => {
      this.pagedFuelVendorData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(vendor: IFuelVendor) {
    const ref = this.dialog.open(FuelVendorForm, {
      panelClass: 'm-auto',
      width: '500px',
      data: { vendorId: vendor.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(vendor: IFuelVendor) {
    if (confirm(`Voulez-vous vraiment supprimer le fournisseur "${vendor.name}"?`)) {
      this.httpService.deleteFuelVendor(vendor.id).subscribe(() => {
        alert("Fournisseur supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(FuelVendorForm, {
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
}