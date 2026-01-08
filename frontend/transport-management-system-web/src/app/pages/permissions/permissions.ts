import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { IUserGroup } from '../../types/userGroup';
import { Http } from '../../services/http';

interface Action {
  label: string;
  key: string;
}

interface ModulePermission {
  name: string;
  key: string;
  actions: Action[];
  children?: ModulePermission[]; 
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

  roles: IUserGroup[] = [];

modules: ModulePermission[] = [
  { name: 'Accueil', key: 'ACCUEIL', actions: [{ label: 'Consulter', key: 'VIEW' }] },

  { name: 'Gestion des chauffeurs', key: 'CHAUFFEUR', actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ] },

  { name: 'Gestion des convoyeurs', key: 'CONVOYER', actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ] },

  { name: 'Gestion des véhicules', key: 'TRUCK', actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ] },

  { name: 'Gestion des voyages', key: 'TRIP', actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ] },

  { name: 'Utilisateurs', key: 'USER_MANAGEMENT', actions: [
      { label: 'Utilisateurs', key: 'USER' },
      { label: 'Groupes d\'utilisateurs', key: 'GROUP' },
      { label: 'Permissions', key: 'PERMISSION' }
    ] },

  { name: 'Gestion des clients', key: 'CUSTOMER', actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ] },

  { name: 'Fournisseurs de carburant', key: 'FUEL_VENDOR', actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ] },

  { name: 'Gestion du carburant', key: 'FUEL', actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ] },

  { name: 'Lieux', key: 'LOCATION', actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ] },

  // Paramètres Généraux avec sous-modules
  { name: 'Paramètres Généraux', key: 'SETTINGS', actions: [], children: [
      { name: 'Heures Supplémentaires', key: 'OVERTIME', actions: [
          { label: 'Consulter', key: 'VIEW' },
          { label: 'Ajouter', key: 'ADD' },
          { label: 'Modifier', key: 'EDIT' },
          { label: 'Supprimer', key: 'DELETE' }
        ] },
      { name: 'Disponibilités', key: 'AVAILABILITY', actions: [
          { label: 'Consulter', key: 'VIEW' },
          { label: 'Ajouter', key: 'ADD' },
          { label: 'Modifier', key: 'EDIT' },
          { label: 'Supprimer', key: 'DELETE' }
        ] },
      { name: 'Jours Fériés', key: 'DAYOFF', actions: [
          { label: 'Consulter', key: 'VIEW' },
          { label: 'Ajouter', key: 'ADD' },
          { label: 'Modifier', key: 'EDIT' },
          { label: 'Supprimer', key: 'DELETE' }
        ] }
    ] },

  { name: 'Gestion des mécaniciens', key: 'MECHANIC', actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ] },

  { name: 'Gestion des vendeurs', key: 'VENDOR', actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ] },

  { name: 'Maintenance Camion', key: 'TRUCK_MAINTENANCE', actions: [
      { label: 'Consulter', key: 'VIEW' },
      { label: 'Ajouter', key: 'ADD' },
      { label: 'Modifier', key: 'EDIT' },
      { label: 'Supprimer', key: 'DELETE' }
    ] },
];


  constructor(private httpService: Http) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  // ✅ Charger tous les rôles et permissions depuis la base
  loadRoles() {
    this.httpService.getAllRoles().subscribe((groups: IUserGroup[]) => {
      this.roles = groups.map(r => ({
        ...r,
        permissions: {} // on initialise vide pour tout
      }));

      // Pour chaque rôle, récupérer ses permissions depuis l'API
      this.roles.forEach(role => {
        this.httpService.getGroupPermissions(role.id).subscribe((codes: string[]) => {

          // Initialiser toutes les permissions du rôle à false
          this.modules.forEach(mod => {
            mod.actions.forEach(act => {
              role.permissions![`${mod.key}_${act.key}`] = false;
            });
          });

          // Marquer les permissions cochées selon la base
          codes.forEach(code => {
            if (role.permissions!.hasOwnProperty(code)) {
              role.permissions![code] = true;
            }
          });

        });
      });
    });
  }

  toggleModule(role: IUserGroup, module: ModulePermission, checked: boolean) {
    module.actions.forEach(act => {
      role.permissions![`${module.key}_${act.key}`] = checked;
    });
  }

  isModuleChecked(role: IUserGroup, module: ModulePermission): boolean {
    return module.actions.every(a => role.permissions![`${module.key}_${a.key}`]);
  }

  save() {
    this.roles.forEach(role => {
      const permissionsToSave = Object.keys(role.permissions!)
        .filter(key => role.permissions![key]);

      this.httpService.saveGroupPermissions(role.id, permissionsToSave).subscribe({
        next: () => console.log(`Permissions sauvegardées pour ${role.name}`),
        error: err => console.error(err)
      });
    });

    alert('Permissions sauvegardées avec succès');
  }
}
