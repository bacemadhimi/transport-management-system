import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';

interface Role {
  name: string;
  permissions: Record<string, boolean>;
}


interface Action {
  label: string;
  key: string;
}

interface ModulePermission {
  name: string;
  key: string;
  actions: Action[];
}

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatButtonModule
  ],
  templateUrl: './permissions.html',
  styleUrls: ['./permissions.scss']
})
export class Permissions {

roles: Role[] = [
  { name: 'Admin', permissions: {} as Record<string, boolean> },
  { name: 'Employé', permissions: {} as Record<string, boolean> },
  { name: 'Gérant', permissions: {} as Record<string, boolean> }
];

  modules: ModulePermission[] = [
    {
      name: 'Camion',
      key: 'CAMION',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Supprimer', key: 'DELETE' }
      ]
    },
    {
      name: 'Chauffeur',
      key: 'CHAUFFEUR',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' }
      ]
    }
  ];

  constructor() {
    this.initPermissions();
  }

  initPermissions() {
    this.roles.forEach(role => {
      this.modules.forEach(mod => {
        mod.actions.forEach(act => {
          role.permissions[`${mod.key}_${act.key}`] = false;
        });
      });
    });
  }

  toggleModule(role: any, module: ModulePermission, checked: boolean) {
    module.actions.forEach(action => {
      role.permissions[`${module.key}_${action.key}`] = checked;
    });
  }

  isModuleChecked(role: any, module: ModulePermission): boolean {
    return module.actions.every(
      a => role.permissions[`${module.key}_${a.key}`]
    );
  }

  save() {
    console.log(this.roles);
    alert('Permissions sauvegardées');
  }
}
