import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { IUserGroup } from '../../types/userGroup';
import { Http } from '../../services/http';

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
export class Permissions  {

  roles: IUserGroup[] = [];

modules = [
  {
    name: 'Accueil',
    key: 'ACCUEIL',
    actions: [{ label: 'Consulter', key: 'VIEW' }]
  },
  {
    name: 'Chauffeur',
    key: 'CHAUFFEUR',
    actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ]
  },
  {
    name: 'Véhicules',
    key: 'TRUCK',
    actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ]
  },
  {
    name: 'Trajets',
    key: 'TRIP',
    actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ]
  },
  {
    name: 'Clients',
    key: 'CUSTOMER',
    actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ]
  },
  {
    name: 'Fournisseurs carburant',
    key: 'FUEL_VENDOR',
    actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ]
  },
  {
    name: 'Carburant',
    key: 'FUEL',
    actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ]
  },
  {
    name: 'Maintenance',
    key: 'MAINTENANCE',
    actions: [
      { label: 'Gestion des mécaniciens', key: 'MECHANIC' },
      { label: 'Gestion des vendeurs', key: 'VENDOR' }
    ]
  },
  {
    name: 'Utilisateurs',
    key: 'USER_MANAGEMENT',
    actions: [
      { label: 'Utilisateurs', key: 'USER' },
      { label: 'Groupes d\'utilisateurs', key: 'GROUP' },
      { label: 'Permissions', key: 'PERMISSION' }
    ]
  }
];


  constructor(private httpService: Http) {}

  ngOnInit(): void {
    this.loadRoles();
  }

loadRoles() {
  this.httpService.getAllRoles().subscribe((groups: IUserGroup[]) => {
    this.roles = groups.map(r => ({
      ...r,
      permissions: r.permissions || {}
    }));

    this.roles.forEach(role => {
      this.modules.forEach(mod => {
        mod.actions.forEach(act => {
          if (role.permissions[`${mod.key}_${act.key}`] === undefined) {
            role.permissions[`${mod.key}_${act.key}`] = false;
          }
        });
      });
    });
  });
}

  initPermissions() {
    this.roles.forEach(role => {
      this.modules.forEach(mod => {
        mod.actions.forEach(act => {
          role.permissions![`${mod.key}_${act.key}`] = false;
        });
      });
    });
  }

  toggleModule(role: IUserGroup, module: any, checked: boolean) {
    module.actions.forEach((action: any) => {
      role.permissions![`${module.key}_${action.key}`] = checked;
    });
  }

  isModuleChecked(role: IUserGroup, module: any): boolean {
    return module.actions.every(
      (a: any) => role.permissions![`${module.key}_${a.key}`]
    );
  }

save() {
  this.roles.forEach(role => {

    const permissionsToSave = Object
      .keys(role.permissions)
      .filter(key => role.permissions[key] === true);

    this.httpService.saveGroupPermissions(
      role.id,
      permissionsToSave
    ).subscribe({
      next: () => {
        console.log(`Permissions sauvegardées pour ${role.name}`);
      },
      error: err => {
        console.error(err);
        alert('Erreur lors de la sauvegarde');
      }
    });

  });

  alert('Permissions sauvegardées avec succès');
}

}
