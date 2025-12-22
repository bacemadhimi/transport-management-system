import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { IMechanic } from '../../../types/mechanic';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-mechanic-form',
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
    MatSelectModule
  ],
  templateUrl: './mechanic-form.html',
  styleUrls: ['./mechanic-form.scss']
})
export class MechanicForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<MechanicForm>);
  data = inject<{ mechanicId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  mechanicForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required]),
    email: this.fb.control<string>('', [Validators.required, Validators.email]),
    phone: this.fb.control<string>('', [Validators.required])
  });

  ngOnInit() {
    if (this.data.mechanicId) {
      this.httpService.getMechanic(this.data.mechanicId).subscribe((mechanic: IMechanic) => {
        console.log("Mechanic returned from API:", mechanic);
        this.mechanicForm.patchValue({
          name: mechanic.name,
          email: mechanic.email,
          phone: mechanic.phone
        });
      });
    }
  }

  onSubmit() {
    if (!this.mechanicForm.valid) return;

    const value: IMechanic = {
      id: this.data.mechanicId || 0,
      name: this.mechanicForm.value.name!,
      email: this.mechanicForm.value.email!,
      phone: this.mechanicForm.value.phone!,
      createdDate: new Date().toISOString()
    };

    if (this.data.mechanicId) {
      this.httpService.updateMechanic(this.data.mechanicId, value).subscribe(() => {
        alert("Mécanicien modifié avec succès");
        this.dialogRef.close(true);
      });
    } else {
      this.httpService.addMechanic(value).subscribe(() => {
        alert("Mécanicien ajouté avec succès");
        this.dialogRef.close(true);
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}