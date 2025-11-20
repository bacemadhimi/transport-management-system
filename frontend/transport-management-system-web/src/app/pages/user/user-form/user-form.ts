// pages/admin/user/user-form/user-form.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { IUser } from '../../../types/user';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-user-form',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule
  ],
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.scss']
})
export class UserForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<UserForm>);
  data = inject<{ userId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};


  userForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
    password: ['', this.data.userId ? [] : [Validators.required, Validators.minLength(6)]],
    profileImage: [''],
    role: ['User', Validators.required] 
  });

  roles = ['Admin', 'User']; 

  ngOnInit() {
    if (this.data.userId) {
      this.httpService.getUserById(this.data.userId).subscribe((user: IUser) => {
        this.userForm.patchValue({
          name: user.name,
          email: user.email,
          phone: user.phone,
          profileImage: user.profileImage,
          role: user.role 
        });
 
        this.userForm.get('password')?.setValue('');
      });
    }
  }

  onSubmit() {
    if (!this.userForm.valid) return;

    const value: any = this.userForm.value;

    if (this.data.userId) {
      this.httpService.UpdateUserById(this.data.userId, value).subscribe(() => {
        alert("Utilisateur modifié avec succès");
        this.dialogRef.close(true);
      });
    } else {
      this.httpService.addUser(value).subscribe(() => {
        alert("Utilisateur ajouté avec succès");
        this.dialogRef.close(true);
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
