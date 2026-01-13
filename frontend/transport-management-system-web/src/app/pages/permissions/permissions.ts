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
// Clés des modules à regrouper sous "Paramètres Généraux"
generalModules: string[] = ['OVERTIME', 'AVAILABILITY', 'DAYOFF'];
userModules: string[] = ['USER', 'USER_GROUP', 'PERMISSION'];
maintenanceModules: string[] = ['MECHANIC', 'VENDOR', 'TRUCK_MAINTENANCE'];

  roles: IUserGroup[] = [];
modules: ModulePermission[] = [

  // Accueil
    {
      name: 'Accueil',
      key: 'ACCUEIL',
      actions: [{ label: 'Consulter', key: 'VIEW' }]
    },

    // Gestion des chauffeurs
    {
      name: 'Gestion des chauffeurs',
      key: 'CHAUFFEUR',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Gestion des convoyeurs
    {
      name: 'Gestion des convoyeurs',
      key: 'CONVOYEUR',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Gestion des véhicules
    {
      name: 'Gestion des véhicules',
      key: 'TRUCK',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Gestion des commandes
    {
      name: 'Gestion des commandes',
      key: 'ORDER',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Gestion des voyages
    {
      name: 'Gestion des voyages',
      key: 'TRAVEL',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Gestion des utilisateurs
    {
      name: 'Gestion des utilisateurs',
      key: 'USER',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Gestion des groupes d’utilisateurs
    {
      name: 'Gestion des groupes d’utilisateurs',
      key: 'USER_GROUP',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Gestion des permissions
    {
      name: 'Gestion des permissions',
      key: 'PERMISSION',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Modifier', key: 'EDIT' }
      ]
    },

    // Gestion des clients
    {
      name: 'Gestion des clients',
      key: 'CUSTOMER',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Fournisseurs carburant
    {
      name: 'Fournisseurs carburant',
      key: 'FUEL_VENDOR',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Carburant
    {
      name: 'Carburant',
      key: 'FUEL',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Lieux
    {
      name: 'Lieux',
      key: 'LOCATION',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Heures Supplémentaires
    {
      name: 'Heures Supplémentaires',
      key: 'OVERTIME',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Disponibilités
    {
      name: 'Disponibilités',
      key: 'AVAILABILITY',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Jours Fériés
    {
      name: 'Jours Fériés',
      key: 'DAYOFF',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Gestion des mécaniciens
    {
      name: 'Gestion des mécaniciens',
      key: 'MECHANIC',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Gestion des vendeurs
    {
      name: 'Gestion des vendeurs',
      key: 'VENDOR',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Maintenance Camion
    {
      name: 'Maintenance Camion',
      key: 'TRUCK_MAINTENANCE',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' }
      ]
    }

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
