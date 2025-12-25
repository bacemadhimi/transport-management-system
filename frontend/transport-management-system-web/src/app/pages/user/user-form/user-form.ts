import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy
} from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { Http } from '../../../services/http';
import { IUser } from '../../../types/user';
import { IRole } from '../../../types/role';

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
    MatIconModule,
    MatTabsModule,
    DragDropModule,
    MatTooltipModule
  ],
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.scss']
})
export class UserForm implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private httpService = inject(Http);
  private dialogRef = inject(MatDialogRef<UserForm>);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();
  
  data = inject<{ userId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private iti: any;

  isSubmitting = false;
  loadingRoles = false;
  hidePassword = true;
  hideConfirmPassword = true;
  hideOldPassword = true;
  showPasswordMeter = false;

  // Password strength properties
  passwordStrength = 0;
  passwordScore = 0;
  passwordRequirements = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  };

  // Image properties
  imagePreview: string | null = null;
  imageBase64: string | null = null;
  originalImageBase64: string | null = null;
  hasExistingImage = false;
  fileError: string | null = null;

  // Form data
  searchTerm = '';
  
  // Drag & Drop data for Roles
  allRoles: IRole[] = [];
  availableRoles: IRole[] = [];
  memberRoles: IRole[] = []; // Max 1 item
  filteredAvailableRoles: IRole[] = [];
  filteredMemberRoles: IRole[] = [];
  selectedRoleId: number | null = null;

  // Form definition
  userForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, this.validatePhone.bind(this)]],
    oldPassword: [''], 
    password: ['', [
      ...(this.data.userId ? [] : [Validators.required]),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    ]],
    confirmPassword: ['', this.data.userId ? [] : [Validators.required]],
    profileImage: [''],
    roleId: [null as number | null, Validators.required]
  }, { 
    validators: [
      this.passwordMatchValidator(),
      this.oldPasswordRequiredValidator() 
    ]
  });

  ngOnInit(): void {
    this.loadRoles();
    
    if (this.data.userId) {
      this.loadUserData();
    }

    // Subscribe to password changes for strength checking
    this.userForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkPasswordStrength();
      });

    // Subscribe to confirm password changes for validation
    this.userForm.get('confirmPassword')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.userForm.updateValueAndValidity();
      });

    // Subscribe to search term changes for filtering roles
    this.userForm.get('search')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.filterRoles());
  }

  private oldPasswordRequiredValidator(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const password = formGroup.get('password')?.value;
      const oldPassword = formGroup.get('oldPassword')?.value;
      
      if (this.data.userId && password && !oldPassword) {
        return { oldPasswordRequired: true };
      }
      
      return null;
    };
  }

  private passwordMatchValidator(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const password = formGroup.get('password')?.value;
      const confirmPassword = formGroup.get('confirmPassword')?.value;
      
      // Only validate if both fields have values
      if (!password && !confirmPassword) {
        return null;
      }
      
      return password === confirmPassword ? null : { passwordMismatch: true };
    };
  }

  getPasswordScoreDetails(): Array<{text: string, satisfied: boolean, points: number}> {
    const password = this.userForm.get('password')?.value || '';
    const length = password.length;
    
    return [
      {
        text: `Longueur (${length} caractères)`,
        satisfied: length >= 8,
        points: Math.min(30, Math.floor((length / 12) * 30))
      },
      {
        text: 'Majuscule & minuscule',
        satisfied: this.passwordRequirements.hasUppercase && this.passwordRequirements.hasLowercase,
        points: this.passwordRequirements.hasUppercase && this.passwordRequirements.hasLowercase ? 20 : 0
      },
      {
        text: 'Chiffres',
        satisfied: this.passwordRequirements.hasNumber,
        points: this.passwordRequirements.hasNumber ? 15 : 0
      },
      {
        text: 'Caractères spéciaux',
        satisfied: this.passwordRequirements.hasSpecialChar,
        points: this.passwordRequirements.hasSpecialChar ? 15 : 0
      },
      {
        text: 'Variété de caractères',
        satisfied: (this.passwordRequirements.hasUppercase ? 1 : 0) + 
                  (this.passwordRequirements.hasLowercase ? 1 : 0) + 
                  (this.passwordRequirements.hasNumber ? 1 : 0) + 
                  (this.passwordRequirements.hasSpecialChar ? 1 : 0) >= 3,
        points: Math.min(20, ((this.passwordRequirements.hasUppercase ? 1 : 0) + 
                (this.passwordRequirements.hasLowercase ? 1 : 0) + 
                (this.passwordRequirements.hasNumber ? 1 : 0) + 
                (this.passwordRequirements.hasSpecialChar ? 1 : 0)) * 5)
      }
    ];
  }

  getPasswordImprovementTips(): string[] {
    const tips: string[] = [];
    const password = this.userForm.get('password')?.value || '';
    
    if (password.length < 8) {
      tips.push(`Ajoutez ${8 - password.length} caractères supplémentaires`);
    }
    
    if (!this.passwordRequirements.hasUppercase) {
      tips.push('Ajoutez au moins une lettre majuscule');
    }
    
    if (!this.passwordRequirements.hasLowercase) {
      tips.push('Ajoutez au moins une lettre minuscule');
    }
    
    if (!this.passwordRequirements.hasNumber) {
      tips.push('Ajoutez au moins un chiffre');
    }
    
    if (!this.passwordRequirements.hasSpecialChar) {
      tips.push('Ajoutez un caractère spécial (@, $, !, %, *, ?, &)');
    }
    
    if (password.length < 12 && this.passwordScore < 80) {
      tips.push('Utilisez 12 caractères ou plus pour plus de sécurité');
    }
    
    if (/^[a-zA-Z]+$/.test(password)) {
      tips.push('Évitez les mots de passe composés uniquement de lettres');
    }
    
    if (/^\d+$/.test(password)) {
      tips.push('Évitez les mots de passe composés uniquement de chiffres');
    }
    
    return tips;
  }

  private loadUserData(): void {
    this.httpService.getUserById(this.data.userId!).subscribe({
      next: (user: IUser) => {
        this.userForm.patchValue({
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          roleId: user.roleId || null
        });

        this.selectedRoleId = user.roleId || null;

        if (user.profileImage) {
          this.imageBase64 = user.profileImage;
          this.imagePreview = `data:image/png;base64,${user.profileImage}`;
          this.originalImageBase64 = user.profileImage;
          this.hasExistingImage = true;
        }
      },
      error: (error) => {
        console.error('Error loading user data:', error);
        Swal.fire('Erreur', 'Impossible de charger les données de l\'utilisateur', 'error');
      }
    });
  }

  private loadRoles(): void {
    this.loadingRoles = true;
    this.httpService.getAllRoles().subscribe({
      next: (roles: IRole[]) => {
        this.allRoles = roles;
        
        if (this.data.userId) {
          // Get the user's current role
          this.httpService.getUserById(this.data.userId!).subscribe({
            next: (user: IUser) => {
              const userRole = roles.find(role => role.id === user.roleId);
              this.initializeRoles(roles, userRole || null);
              this.loadingRoles = false;
            },
            error: () => {
              this.initializeRoles(roles, null);
              this.loadingRoles = false;
            }
          });
        } else {
          this.initializeRoles(roles, null);
          this.loadingRoles = false;
        }
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.loadingRoles = false;
        Swal.fire('Erreur', 'Impossible de charger les rôles', 'error');
      }
    });
  }

  private initializeRoles(allRoles: IRole[], userRole: IRole | null): void {
    if (userRole) {
      // Add to member roles (max 1)
      this.memberRoles = [userRole];
      this.selectedRoleId = userRole.id;
      this.availableRoles = allRoles.filter(role => role.id !== userRole.id);
    } else {
      this.memberRoles = [];
      this.selectedRoleId = null;
      this.availableRoles = [...allRoles];
    }
    
    this.filteredAvailableRoles = [...this.availableRoles];
    this.filteredMemberRoles = [...this.memberRoles];
    this.userForm.patchValue({ roleId: this.selectedRoleId });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.loadIntlTelInput();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Drag and drop methods
  drop(event: CdkDragDrop<IRole[]>): void {
    // Don't allow reordering within the same list
    if (event.previousContainer === event.container) {
      return;
    }
    
    // Moving FROM available TO member
    if (event.container.id === 'memberList') {
      // Check if member list already has an item
      if (this.memberRoles.length >= 1) {
        Swal.fire('Info', 'Un seul rôle peut être attribué', 'info');
        return;
      }
      
      const item = event.previousContainer.data[event.previousIndex];
      
      // Remove from available
      const availIndex = this.availableRoles.findIndex(r => r.id === item.id);
      if (availIndex > -1) {
        this.availableRoles.splice(availIndex, 1);
        this.memberRoles.push(item);
        this.selectedRoleId = item.id;
      }
    } 
    // Moving FROM member TO available
    else if (event.previousContainer.id === 'memberList') {
      const item = event.previousContainer.data[event.previousIndex];
      
      // Remove from member
      const memberIndex = this.memberRoles.findIndex(r => r.id === item.id);
      if (memberIndex > -1) {
        this.memberRoles.splice(memberIndex, 1);
        this.availableRoles.push(item);
        this.selectedRoleId = null;
      }
    }
    
    this.filterRoles();
    this.userForm.patchValue({ roleId: this.selectedRoleId });
  }

  filterRoles(): void {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredAvailableRoles = [...this.availableRoles];
      this.filteredMemberRoles = [...this.memberRoles];
      return;
    }
    
    this.filteredAvailableRoles = this.availableRoles.filter(role => 
      role.name.toLowerCase().includes(term)
    );
  
    this.filteredMemberRoles = this.memberRoles.filter(role => 
      role.name.toLowerCase().includes(term)
    );
  }

  // Add single role to member
  addToMemberRoles(): void {
    if (this.availableRoles.length === 0 || this.memberRoles.length >= 1) {
      return;
    }
    
    // Take first available role
    const role = this.availableRoles[0];
    this.memberRoles.push(role);
    this.selectedRoleId = role.id;
    this.availableRoles = this.availableRoles.filter(r => r.id !== role.id);
    this.filterRoles();
    this.userForm.patchValue({ roleId: this.selectedRoleId });
  }

  // Remove all roles (should only be 1)
  removeAllRoles(): void {
    if (this.memberRoles.length === 0) return;
    
    // Move all member roles back to available
    this.availableRoles = [...this.availableRoles, ...this.memberRoles];
    this.memberRoles = [];
    this.selectedRoleId = null;
    this.filterRoles();
    this.userForm.patchValue({ roleId: this.selectedRoleId });
  }

  // Remove specific role from member
  removeFromMemberRoles(role: IRole): void {
    const index = this.memberRoles.findIndex(r => r.id === role.id);
    if (index > -1) {
      this.memberRoles.splice(index, 1);
      this.availableRoles.push(role);
      this.selectedRoleId = null;
      this.filterRoles();
      this.userForm.patchValue({ roleId: this.selectedRoleId });
    }
  }

  // Phone validation and IntlTelInput methods
  private loadIntlTelInput(): void {
    if (!this.phoneInput?.nativeElement) {
      console.warn('Phone input element not found');
      return;
    }

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
        if (!this.phoneInput?.nativeElement) return;
        
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
      })
      .catch((error) => {
        console.error('Failed to load intl-tel-input:', error);
      });
  }

  private validatePhone(control: AbstractControl): ValidationErrors | null {
    if (!this.iti || !control.value) return null;
    return this.iti.isValidNumber() ? null : { pattern: true };
  }

  // Form submission
  onSubmit(): void {
    if (this.userForm.invalid || this.isSubmitting) return;
    
    if (!this.iti) {
      Swal.fire('Erreur', 'Le champ téléphone n\'est pas initialisé. Veuillez patienter un instant.', 'error');
      return;
    }

    if (this.userForm.hasError('passwordMismatch')) {
      Swal.fire('Erreur', 'Les mots de passe ne correspondent pas', 'error');
      return;
    }

    if (this.data.userId && this.userForm.get('password')?.value && !this.userForm.get('oldPassword')?.value) {
      Swal.fire('Erreur', 'L\'ancien mot de passe est requis pour modifier le mot de passe', 'error');
      return;
    }

    if (!this.selectedRoleId) {
      Swal.fire('Erreur', 'Veuillez sélectionner un rôle', 'error');
      return;
    }

    this.isSubmitting = true;

    const value = this.userForm.value;

    const payload: any = {
      name: value.name!,
      email: value.email!,
      phone: this.iti.getNumber(),
      phoneCountry: this.iti.getSelectedCountryData()?.iso2,
      roleId: this.selectedRoleId
    };

    // Add password fields only if provided
    if (value.password) {
      payload.password = value.password;
    }
    
    if (value.oldPassword) {
      payload.oldPassword = value.oldPassword;
    }

    // Add profile image only if changed
    if (this.imageBase64 !== this.originalImageBase64) {
      payload.profileImage = this.imageBase64 || null;
    }

    const request$ = this.data.userId
      ? this.httpService.UpdateUserById(this.data.userId, payload)
      : this.httpService.addUser(payload);

    request$.subscribe({
      next: () => {
        Swal.fire({
          title: 'Succès',
          text: this.data.userId ? 'Utilisateur modifié avec succès' : 'Utilisateur ajouté avec succès',
          icon: 'success',
          showConfirmButton: false,
          timer: 1500
        }).then(() => this.dialogRef.close(true));
      },
      error: (error) => {
        console.error('Error saving user:', error);
        const errorMessage = error.error?.message || error.error?.errors?.[0]?.message || 'Opération échouée';
        Swal.fire('Erreur', errorMessage, 'error');
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    if (this.userForm.dirty || this.memberRoles.length > 0) {
      Swal.fire({
        title: 'Voulez-vous annuler?',
        text: 'Les modifications non enregistrées seront perdues',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui, annuler',
        cancelButtonText: 'Non, continuer'
      }).then((result) => {
        if (result.isConfirmed) {
          this.dialogRef.close();
        }
      });
    } else {
      this.dialogRef.close();
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      this.fileError = 'La taille de l\'image ne doit pas dépasser 2MB';
      return;
    }

    // Validate file type
    if (!file.type.match(/image\/(jpeg|png|jpg|gif|webp)/)) {
      this.fileError = 'Seules les images (JPEG, PNG, JPG, GIF, WEBP) sont autorisées';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.imageBase64 = this.imagePreview.split(',')[1];
      this.fileError = null;
    };
    reader.onerror = () => {
      this.fileError = 'Erreur lors de la lecture du fichier';
    };
    reader.readAsDataURL(file);
  }

  onDeletePhoto(): void {
    Swal.fire({
      title: 'Supprimer la photo?',
      text: 'Cette action est irréversible',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.imagePreview = null;
        this.imageBase64 = '';
        this.fileInput.nativeElement.value = '';
      }
    });
  }

  // Error message handling
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
      if (controlName === 'password') {
        return 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial';
      }
      if (controlName === 'phone') {
        return 'Numéro de téléphone invalide';
      }
      return 'Format invalide';
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
      confirmPassword: 'La confirmation du mot de passe',
      roleId: 'Le rôle'
    };
    
    return labels[controlName] || controlName;
  }

  get hasPhoto(): boolean {
    return !!this.imagePreview || this.hasExistingImage;
  }

  get isPhotoChanged(): boolean {
    return this.imageBase64 !== this.originalImageBase64;
  }

  // Password strength methods
  getPasswordStrengthClass(): string {
    switch (this.passwordStrength) {
      case 1: return 'strength-very-weak';
      case 2: return 'strength-weak';
      case 3: return 'strength-medium';
      case 4: return 'strength-good';
      case 5: return 'strength-excellent';
      default: return '';
    }
  }

  onPasswordBlur(): void {
    setTimeout(() => {
      if (!this.userForm.get('password')?.value) {
        this.showPasswordMeter = false;
      }
    }, 200);
  }

  calculatePasswordScore(): number {
    // Calculate score based on requirements met
    let score = 0;
    if (this.passwordRequirements.minLength) score += 20;
    if (this.passwordRequirements.hasUppercase) score += 20;
    if (this.passwordRequirements.hasLowercase) score += 20;
    if (this.passwordRequirements.hasNumber) score += 20;
    if (this.passwordRequirements.hasSpecialChar) score += 20;
    
    this.passwordScore = score;
    return score;
  }

  checkPasswordStrength(): void {
    const password = this.userForm.get('password')?.value || '';
    
    // Reset requirements
    this.passwordRequirements = {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecialChar: false
    };
    
    if (!password) {
      this.passwordStrength = 0;
      this.passwordScore = 0;
      return;
    }

    // Check requirements
    this.passwordRequirements.minLength = password.length >= 8;
    this.passwordRequirements.hasUppercase = /[A-Z]/.test(password);
    this.passwordRequirements.hasLowercase = /[a-z]/.test(password);
    this.passwordRequirements.hasNumber = /\d/.test(password);
    this.passwordRequirements.hasSpecialChar = /[@$!%*?&]/.test(password);

    // Calculate strength level (0-5)
    let metRequirements = 0;
    
    if (this.passwordRequirements.minLength) metRequirements++;
    if (this.passwordRequirements.hasUppercase) metRequirements++;
    if (this.passwordRequirements.hasLowercase) metRequirements++;
    if (this.passwordRequirements.hasNumber) metRequirements++;
    if (this.passwordRequirements.hasSpecialChar) metRequirements++;
    
    this.passwordStrength = metRequirements;
    this.calculatePasswordScore();
  }

  getStrengthColor(): string {
    switch (this.passwordStrength) {
      case 1: return '#ff4444'; // Red
      case 2: return '#ff8800'; // Orange
      case 3: return '#ffcc00'; // Yellow
      case 4: return '#44cc44'; // Light Green
      case 5: return '#008800'; // Dark Green
      default: return '#666666'; // Grey
    }
  }

  getPasswordStrengthText(): string {
    switch (this.passwordStrength) {
      case 0: return 'Très faible';
      case 1: return 'Très faible';
      case 2: return 'Faible';
      case 3: return 'Moyen';
      case 4: return 'Bon';
      case 5: return 'Excellent';
      default: return '';
    }
  }

  // Utility method to check if form has changes
  hasFormChanges(): boolean {
    return this.userForm.dirty || this.isPhotoChanged || this.memberRoles.length > 0;
  }
}