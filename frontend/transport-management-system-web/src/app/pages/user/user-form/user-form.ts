// pages/admin/user/user-form/user-form.component.ts
import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Http } from '../../../services/http';
import { IUser } from '../../../types/user';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.scss']
})
export class UserForm implements OnInit, AfterViewInit {

  private fb = inject(FormBuilder);
  private httpService = inject(Http);
  private dialogRef = inject(MatDialogRef<UserForm>);
  data = inject<{ userId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  private iti: any; // intl-tel-input instance
  
  isSubmitting = false;

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
    phone: ['', [Validators.required, this.validatePhone.bind(this)]],
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
          phone: user.phone || '',
          profileImage: user.profileImage,
          role: user.role,
          permissions: user.permissions ? JSON.parse(user.permissions as unknown as string) : {}
        });
        this.userForm.get('password')?.setValue('');
      });
    }
  }

  ngAfterViewInit() {
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.body.appendChild(script);
      });

    const loadCSS = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    };

    loadCSS('https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/css/intlTelInput.min.css');

    loadScript('https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/intlTelInput.min.js')
      .then(() => loadScript('https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'))
      .then(() => {
        if (this.phoneInput?.nativeElement) {
          this.iti = (window as any).intlTelInput(
            this.phoneInput.nativeElement,
            {
              initialCountry: 'tn',
              separateDialCode: true,
              nationalMode: false,
              formatOnDisplay: true,
              utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'
            }
          );

          // Update form control value when phone input changes
          this.phoneInput.nativeElement.addEventListener('blur', () => {
            const number = this.iti.getNumber();
            this.userForm.get('phone')?.setValue(number);
          });

          // Initialize with existing phone number if available
          setTimeout(() => {
            const currentPhone = this.userForm.get('phone')?.value;
            if (currentPhone && this.iti) {
              this.iti.setNumber(currentPhone);
            }
          }, 0);
        }
      })
      .catch(() => {
        console.error('Failed to load intl-tel-input scripts.');
      });
  }

  private validatePhone(control: any) {
    if (!this.iti) return null;
    return this.iti.isValidNumber() ? null : { pattern: true };
  }

  getErrorMessage(controlName: string): string {
    const control = this.userForm.get(controlName);
    
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} est obligatoire`;
    }
    
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} doit comporter au moins ${requiredLength} caractères`;
    }
    
    if (control?.hasError('pattern')) {
      return 'Format de téléphone invalide';
    }
    
    if (control?.hasError('email')) {
      return 'Veuillez entrer une adresse email valide';
    }
    
    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Le nom',
      phone: 'Le téléphone',
      email: 'L\'email',
      password: 'Le mot de passe',
      role: 'Le rôle'
    };
    return labels[controlName] || controlName;
  }

  onSubmit() {
    if (this.userForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const formValue = this.userForm.value;

    // Construction du payload avec formatted phone
    const payload: IUser = {
      id: this.data.userId || 0,
      name: formValue.name ?? '',
      email: formValue.email ?? '',
      phone: this.iti?.getNumber() ?? formValue.phone ?? '',
      phoneCountry: this.iti?.getSelectedCountryData()?.iso2,
      password: formValue.password || undefined,
      profileImage: formValue.profileImage ?? undefined,
      role: formValue.role ?? 'User',
      permissions: undefined
    };

    // Conversion permissions en JSON pour le backend
    if (formValue.permissions) {
      payload.permissions = JSON.stringify(
        Object.keys(formValue.permissions).reduce((acc, key) => {
          acc[key] = !!formValue.permissions![key];
          return acc;
        }, {} as { [key: string]: boolean })
      );
    }

    // Appel API
    if (this.data.userId) {
      this.httpService.UpdateUserById(this.data.userId, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          alert('Utilisateur modifié avec succès');
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.isSubmitting = false;
        }
      });
    } else {
      // Suppression de l'id pour ajout
      const { id, ...addPayload } = payload;
      this.httpService.addUser(addPayload as IUser).subscribe({
        next: () => {
          this.isSubmitting = false;
          alert('Utilisateur ajouté avec succès');
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error adding user:', error);
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}