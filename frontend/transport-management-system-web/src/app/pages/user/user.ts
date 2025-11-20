
import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { IUser } from '../../types/user';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { UserForm } from './user-form/user-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user',
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
  templateUrl: './user.html',
  styleUrl: './user.scss'
})
export class User implements OnInit {
  httpService = inject(Http);
  pagedUserData!: PagedData<IUser>;
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
    { key: 'name', label: 'Nom complet' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Téléphone' },
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
    this.httpService.getUsersList(this.filter).subscribe(result => {
      this.pagedUserData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(user: IUser) {
    const ref = this.dialog.open(UserForm, {
      panelClass: 'm-auto',
      data: { userId: user.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(user: IUser) {
    if (confirm(`Voulez-vous vraiment supprimer l'utilisateur ${user.name}?`)) {
      this.httpService.deleteUser(user.id).subscribe(() => {
        alert("Utilisateur supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(UserForm, {
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
