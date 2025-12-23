// pages/admin/user/user-form/user-form.component.ts

import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import Swal from 'sweetalert2';

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
    MatProgressSpinnerModule,
    MatIconModule
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
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private iti: any;

  isSubmitting = false;

  imagePreview: string | null = null;
  imageBase64: string | null = null;
  originalImageBase64: string | null = null;
  hasExistingImage = false;
  fileError: string | null = null;

  roles = ['Admin', 'User'];

  permissionModules = [
    { module: 'Driver', actions: ['List', 'Add', 'Edit', 'Delete'] },
    { module: 'Truck', actions: ['List', 'Add', 'Edit', 'Delete'] },
    { module: 'Trip', actions: ['List', 'Add', 'Edit', 'Delete'] },
    { module: 'Customer', actions: ['List', 'Add', 'Edit', 'Delete'] },
    { module: 'Fuel', actions: ['List', 'Add', 'Edit', 'Delete'] },
    { module: 'User', actions: ['List', 'Add', 'Edit', 'Delete'] },
    { module: 'Dashboard', actions: ['View'] }
  ];

  userForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, this.validatePhone.bind(this)]],
    password: [''],
    profileImage: [''],
    role: ['User', Validators.required],
    permissions: this.fb.group(this.buildPermissionsGroup())
  });

  // -------------------- INIT --------------------

  ngOnInit(): void {
    if (this.data.userId) {
      this.httpService.getUserById(this.data.userId).subscribe((user: IUser) => {
        this.userForm.patchValue({
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          permissions: user.permissions ? JSON.parse(user.permissions as any) : {}
        });

        if (user.profileImage) {
          this.imageBase64 = user.profileImage;
          this.imagePreview = `data:image/png;base64,${user.profileImage}`;
          this.originalImageBase64 = user.profileImage;
          this.hasExistingImage = true;
        }
      });
    }
  }

  ngAfterViewInit(): void {
    this.loadIntlTelInput();
  }

  // -------------------- PHONE --------------------

  private loadIntlTelInput(): void {
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
        this.iti = (window as any).intlTelInput(this.phoneInput.nativeElement, {
          initialCountry: 'tn',
          separateDialCode: true,
          nationalMode: false,
          utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'
        });

        this.phoneInput.nativeElement.addEventListener('input', () => {
          const number = this.iti.getNumber();
          this.userForm.get('phone')?.setValue(number, { emitEvent: false });
          this.userForm.get('phone')?.updateValueAndValidity();
        });

        const existingPhone = this.userForm.get('phone')?.value;
        if (existingPhone) {
          this.iti.setNumber(existingPhone);
        }

        this.userForm.get('phone')?.updateValueAndValidity();
      });
  }

  private validatePhone(control: AbstractControl): ValidationErrors | null {
    if (!this.iti || !control.value) return null;
    return this.iti.isValidNumber() ? null : { pattern: true };
  }

  // -------------------- PERMISSIONS --------------------

  buildPermissionsGroup() {
    const group: any = {};
    this.permissionModules.forEach(m =>
      m.actions.forEach(a => (group[this.getPermissionKey(m.module, a)] = false))
    );
    return group;
  }

  getPermissionKey(module: string, action: string): string {
    return `${module}_${action}`.toUpperCase();
  }

  // -------------------- SUBMIT --------------------

  onSubmit(): void {
    if (this.userForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    const value = this.userForm.value;

    const payload: IUser = {
      id: this.data.userId ?? 0,
      name: value.name!,
      email: value.email!,
      phone: this.iti.getNumber(),
      phoneCountry: this.iti.getSelectedCountryData()?.iso2,
      password: value.password || undefined,
      profileImage: this.imageBase64 || undefined,
      role: value.role!,
      permissions: JSON.stringify(value.permissions || {})
    };

    const request$ = this.data.userId
      ? this.httpService.UpdateUserById(this.data.userId, payload)
      : this.httpService.addUser(payload);

    request$.subscribe({
      next: () => {
        Swal.fire('Succès', 'Utilisateur enregistré avec succès', 'success')
          .then(() => this.dialogRef.close(true));
      },
      error: () => {
        Swal.fire('Erreur', 'Opération échouée', 'error');
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // -------------------- IMAGE --------------------

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.fileError = 'Image max 2MB';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.imageBase64 = this.imagePreview.split(',')[1];
    };
    reader.readAsDataURL(file);
  }

  onDeletePhoto(): void {
    this.imagePreview = null;
    this.imageBase64 = '';
    this.fileInput.nativeElement.value = '';
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
    
    return labels[controlName] || controlName;}

get hasPhoto(): boolean {
  return !!this.imagePreview || this.hasExistingImage;
}

get isPhotoChanged(): boolean {
  return this.imageBase64 !== this.originalImageBase64;
}

}
