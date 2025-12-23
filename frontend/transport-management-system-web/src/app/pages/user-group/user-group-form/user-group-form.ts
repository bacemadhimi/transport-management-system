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
import { IUserGroup } from '../../../types/user-group';

@Component({
  selector: 'app-user-group-form',
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
  templateUrl: './user-group-form.html',
  styleUrls: ['./user-group-form.scss']
})
export class UserGroupForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<UserGroupForm>);
  data = inject<{ groupId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  groupForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required])
  });

  ngOnInit() {
    if (this.data.groupId) {
      this.httpService.getUserGroup(this.data.groupId).subscribe((group: IUserGroup) => {
        this.groupForm.patchValue({
          name: group.name
        });
      });
    }
  }

  onSubmit() {
    if (!this.groupForm.valid) return;

    const value = {
      id: this.data.groupId || 0,
      name: this.groupForm.value.name!
    };

    if (this.data.groupId) {
      this.httpService.updateUserGroup(this.data.groupId, value).subscribe(() => {
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
      this.httpService.addUserGroup(value).subscribe(() => {
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