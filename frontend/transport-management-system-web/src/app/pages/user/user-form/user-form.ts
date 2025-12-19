// pages/admin/user/user-form/user-form.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { Http } from '../../../services/http';
import { IUser } from '../../../types/user';
import { MatCheckboxModule } from '@angular/material/checkbox';


@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatCheckboxModule,
    MatCardModule,
    ReactiveFormsModule
  ],
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.scss']
})
export class UserForm implements OnInit {

  private fb = inject(FormBuilder);
  private httpService = inject(Http);
  private dialogRef = inject(MatDialogRef<UserForm>);
  data = inject<{ userId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  // Rôles
  roles = ['Admin', 'User'];

  // Modules et actions pour permissions
  permissionModules = [  
    { module: 'Driver', actions: ['List', 'Add', 'Edit', 'Delete'] },
    { module: 'Truck', actions: ['List','Add', 'Edit', 'Delete'] },
    { module: 'Trip', actions: ['List', 'Add', 'Edit', 'Delete'] },
    { module: 'Customer', actions: ['List', 'Add', 'Edit', 'Delete'] },
    { module: 'Fuel', actions: ['List', 'Add', 'Edit', 'Delete'] },
    { module: 'User', actions: ['List', 'Add', 'Edit', 'Delete'] },
    { module: 'Dashboard', actions: ['View'] },
  ];

  // Formulaire utilisateur
  userForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
    password: ['', []],
    profileImage: [''],
    role: ['User', Validators.required],
    permissions: this.fb.group(this.buildPermissionsGroup())
  });

  // Construction des contrôles permissions
  buildPermissionsGroup() {
    const group: any = {};
    this.permissionModules.forEach(m => {
      m.actions.forEach(a => {
        const key = this.getPermissionKey(m.module, a);
        group[key] = false;
      });
    });
    return group;
  }

  // Génération de la clé permission
  getPermissionKey(module: string, action: string): string {
    return `${module}_${action}`.replace(/ /g, '_').toUpperCase();
  }

  ngOnInit() {
    // Validation mot de passe uniquement à l'ajout
    if (!this.data.userId) {
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    }
    this.userForm.get('password')?.updateValueAndValidity();

    // Mode édition : récupération utilisateur
    if (this.data.userId) {
      this.httpService.getUserById(this.data.userId).subscribe((user: IUser) => {
        this.userForm.patchValue({
          name: user.name,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
          role: user.role,
          permissions: user.permissions ? JSON.parse(user.permissions as unknown as string) : {}
        });
        this.userForm.get('password')?.setValue('');
      });
    }
  }

  onSubmit() {
    if (this.userForm.invalid) return;

    const formValue = this.userForm.value;

    // Construction du payload
    const payload: IUser = {
      id: this.data.userId || 0, // temporaire pour front
      name: formValue.name ?? '',
      email: formValue.email ?? '',
      phone: formValue.phone ?? '',
      password: formValue.password ?? undefined,
      profileImage: formValue.profileImage ?? undefined,
      role: formValue.role ?? 'User',
      permissions: undefined
    };

    // Conversion permissions en JSON pour le backend
  if (formValue.permissions) {
  payload.permissions = JSON.stringify(
    Object.keys(formValue.permissions).reduce((acc, key) => {
      // Ici on assure à TypeScript que formValue.permissions existe
      acc[key] = !!formValue.permissions![key];
      return acc;
    }, {} as { [key: string]: boolean })
  );
}


    // Appel API
    if (this.data.userId) {
      this.httpService.UpdateUserById(this.data.userId, payload).subscribe(() => {
        alert('Utilisateur modifié avec succès');
        this.dialogRef.close(true);
      });
    } else {
      // Suppression de l'id pour ajout
      const { id, ...addPayload } = payload;
      this.httpService.addUser(addPayload as IUser).subscribe(() => {
        alert('Utilisateur ajouté avec succès');
        this.dialogRef.close(true);
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
