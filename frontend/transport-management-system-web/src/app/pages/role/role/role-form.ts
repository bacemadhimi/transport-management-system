import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';

import Swal from 'sweetalert2';
import { IUserGroup } from '../../../types/userGroup';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './role-form.html',
  styleUrls: ['./role-form.scss']
})
export class RoleForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<RoleForm>);
  data = inject<{ groupId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  roleForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required])
  });

  ngOnInit() {
    if (this.data.groupId) {
      this.httpService.getRole(this.data.groupId).subscribe((group: IUserGroup) => {
        this.roleForm.patchValue({
          name: group.name
        });
      });
    }
  }

  onSubmit() {
    if (!this.roleForm.valid) return;

    const value = {
      id: this.data.groupId || 0,
      name: this.roleForm.value.name!
    };

    if (this.data.groupId) {
      this.httpService.updateRole(this.data.groupId, value).subscribe(() => {
        Swal.fire({
          icon: 'success',
          title: 'Groupe modifié avec succès',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            icon: 'swal2-icon-custom',
            confirmButton: 'swal2-confirm-custom'
          }
        }).then(() => this.dialogRef.close(true));
      });
    } else {
      this.httpService.addRole(value).subscribe(() => {
        Swal.fire({
          icon: 'success',
          title: 'Groupe ajouté avec succès',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            icon: 'swal2-icon-custom',
            confirmButton: 'swal2-confirm-custom'
          }
        }).then(() => this.dialogRef.close(true));
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}