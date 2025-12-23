import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';

interface Group {
  name: string;
  permissions: { [key: string]: boolean };
}

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTableModule
  ],
  templateUrl: './permissions.html',
  styleUrls: ['./permissions.scss']
})
export class Permissions {

  modules = ['Utilisateurs', 'Clients', 'Véhicules', 'Maintenance', 'Rapports'];
  actions = ['Voir', 'Ajouter', 'Modifier', 'Supprimer'];


  displayedColumns: string[] = ['name', 
    ...this.modules.flatMap(mod => this.actions.map(act => `${mod}_${act}`))
  ];

  groups: Group[] = [
    { name: 'Admin', permissions: {} },
    { name: 'Manager', permissions: {} },
    { name: 'Chauffeur', permissions: {} }
  ];

  constructor() {
 
    this.groups.forEach(group => {
      this.modules.forEach(mod => {
        this.actions.forEach(act => {
          group.permissions[`${mod}_${act}`] = false;
        });
      });
    });
  }

  savePermissions() {
    console.log('Permissions sauvegardées :', this.groups);
    alert('Permissions sauvegardées !');
  }
}
