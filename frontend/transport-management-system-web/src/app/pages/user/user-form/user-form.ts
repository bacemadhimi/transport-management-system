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
  ValidationErrors
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
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { Http } from '../../../services/http';
import { IUser } from '../../../types/user';
import { IUserGroup } from '../../../types/user-group';

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
    DragDropModule
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
  loadingUserGroups = false;

  // Image properties
  imagePreview: string | null = null;
  imageBase64: string | null = null;
  originalImageBase64: string | null = null;
  hasExistingImage = false;
  fileError: string | null = null;

  // Form data
  roles = ['Admin', 'User'];
  searchTerm = '';
  
  // Drag & Drop data
  allUserGroups: IUserGroup[] = []; // All groups in the system
  availableGroups: IUserGroup[] = []; // Groups user does NOT belong to (left column)
  memberGroups: IUserGroup[] = []; // Groups user DOES belong to (right column)
  filteredAvailableGroups: IUserGroup[] = [];
  filteredMemberGroups: IUserGroup[] = [];
  selectedUserGroupIds: number[] = [];

  userForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, this.validatePhone.bind(this)]],
    password: [''],
    profileImage: [''],
    role: ['User', Validators.required],
    groupIds: [[] as number[]]
  });

  // -------------------- INIT --------------------

  ngOnInit(): void {
    this.loadUserGroups();
    
    if (this.data.userId) {
      this.loadUserData();
    }

    // Search debounce
    this.userForm.get('search')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.filterGroups());
  }

  private loadUserData(): void {
    this.httpService.getUserById(this.data.userId!).subscribe((user: IUser) => {
      this.userForm.patchValue({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        groupIds: user.groupIds || []
      });

      this.selectedUserGroupIds = user.groupIds || [];

      if (user.profileImage) {
        this.imageBase64 = user.profileImage;
        this.imagePreview = `data:image/png;base64,${user.profileImage}`;
        this.originalImageBase64 = user.profileImage;
        this.hasExistingImage = true;
      }
    });
  }

  private loadUserGroups(): void {
    this.loadingUserGroups = true;
    this.httpService.getAllUserGroups().subscribe({
      next: (groups: IUserGroup[]) => {
        this.allUserGroups = groups;
        
        if (this.data.userId) {
          this.httpService.getUserGroupsByUserId(this.data.userId!).subscribe({
            next: (userGroups: IUserGroup[]) => {
              this.initializeGroups(groups, userGroups);
              this.loadingUserGroups = false;
            },
            error: () => {
              this.initializeGroups(groups, []);
              this.loadingUserGroups = false;
            }
          });
        } else {
          this.initializeGroups(groups, []);
          this.loadingUserGroups = false;
        }
      },
      error: (error) => {
        console.error('Error loading user groups:', error);
        this.loadingUserGroups = false;
        Swal.fire('Erreur', 'Impossible de charger les groupes d\'utilisateurs', 'error');
      }
    });
  }

  private initializeGroups(allGroups: IUserGroup[], userGroups: IUserGroup[]): void {
    // Get IDs of groups the user already belongs to
    const memberGroupIds = userGroups.map(g => g.id);
    this.selectedUserGroupIds = memberGroupIds;
    
    console.log('User belongs to group IDs:', memberGroupIds);
    console.log('All groups count:', allGroups.length);
    
    // Available groups = ALL groups EXCEPT those user already belongs to
    this.availableGroups = allGroups.filter(group => 
      !memberGroupIds.includes(group.id)
    );
    
    // Member groups = ONLY groups user already belongs to
    this.memberGroups = allGroups.filter(group => 
      memberGroupIds.includes(group.id)
    );
    
    // Initialize filtered lists
    this.filteredAvailableGroups = [...this.availableGroups];
    this.filteredMemberGroups = [...this.memberGroups];
    
    console.log('Available groups (left):', this.availableGroups.length);
    console.log('Member groups (right):', this.memberGroups.length);
    
    this.userForm.patchValue({ groupIds: this.selectedUserGroupIds });
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

  // -------------------- DRAG & DROP --------------------

  drop(event: CdkDragDrop<IUserGroup[]>) {
    if (event.previousContainer === event.container) {
      // Move within same list
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      const item = event.previousContainer.data[event.previousIndex];
      
      // Remove from previous list
      const prevIndex = event.previousContainer.data.indexOf(item);
      if (prevIndex > -1) {
        event.previousContainer.data.splice(prevIndex, 1);
      }
      
      // Add to new list
      event.container.data.splice(event.currentIndex, 0, item);
      
      // Update the arrays
      if (event.container.id === 'memberList') {
        // Moved to member groups (right column)
        if (!this.selectedUserGroupIds.includes(item.id)) {
          this.selectedUserGroupIds.push(item.id);
        }
        // Remove from available groups if it's there
        const availIndex = this.availableGroups.findIndex(g => g.id === item.id);
        if (availIndex > -1) {
          this.availableGroups.splice(availIndex, 1);
          this.memberGroups.push(item);
        }
      } else {
        // Moved to available groups (left column)
        const memberIndex = this.selectedUserGroupIds.indexOf(item.id);
        if (memberIndex > -1) {
          this.selectedUserGroupIds.splice(memberIndex, 1);
        }
        // Remove from member groups if it's there
        const memberGroupIndex = this.memberGroups.findIndex(g => g.id === item.id);
        if (memberGroupIndex > -1) {
          this.memberGroups.splice(memberGroupIndex, 1);
          this.availableGroups.push(item);
        }
      }
      
      // Update filtered lists
      this.filterGroups();
    }
  }

  // -------------------- GROUP MANAGEMENT --------------------

  filterGroups(): void {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredAvailableGroups = [...this.availableGroups];
      this.filteredMemberGroups = [...this.memberGroups];
      return;
    }
    
  }

  addAllGroups(): void {
    // Move all available groups to member groups
    this.memberGroups = [...this.memberGroups, ...this.availableGroups];
    this.selectedUserGroupIds = this.memberGroups.map(g => g.id);
    this.availableGroups = [];
    this.filterGroups();
  }

  removeAllGroups(): void {
    // Move all member groups back to available groups
    this.availableGroups = [...this.availableGroups, ...this.memberGroups];
    this.memberGroups = [];
    this.selectedUserGroupIds = [];
    this.filterGroups();
  }

  addToMemberGroups(group: IUserGroup): void {
    const index = this.availableGroups.findIndex(g => g.id === group.id);
    if (index > -1) {
      this.availableGroups.splice(index, 1);
      this.memberGroups.push(group);
      this.selectedUserGroupIds.push(group.id);
      this.filterGroups();
    }
  }

  removeFromMemberGroups(group: IUserGroup): void {
    const index = this.memberGroups.findIndex(g => g.id === group.id);
    if (index > -1) {
      this.memberGroups.splice(index, 1);
      this.availableGroups.push(group);
      const idIndex = this.selectedUserGroupIds.indexOf(group.id);
      if (idIndex > -1) {
        this.selectedUserGroupIds.splice(idIndex, 1);
      }
      this.filterGroups();
    }
  }

  isGroupInMemberGroups(group: IUserGroup): boolean {
    return this.memberGroups.some(g => g.id === group.id);
  }

  // -------------------- CREATE NEW GROUP --------------------

  openAddGroupDialog(): void {
    Swal.fire({
      title: 'Nouveau groupe',
      html: `
        <input id="group-name" class="swal2-input" placeholder="Nom du groupe" required>
        <textarea id="group-description" class="swal2-textarea" placeholder="Description (optionnelle)"></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Créer',
      cancelButtonText: 'Annuler',
      focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById('group-name') as HTMLInputElement).value;
        const description = (document.getElementById('group-description') as HTMLTextAreaElement).value;
        
        if (!name) {
          Swal.showValidationMessage('Le nom du groupe est requis');
          return false;
        }
        
        return { name, description };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.createUserGroup(result.value);
      }
    });
  }

  private createUserGroup(groupData: { name: string; description?: string }): void {
    this.httpService.createUserGroup(groupData).subscribe({
      next: (newGroup: IUserGroup) => {
        // Add to all groups list
        this.allUserGroups.push(newGroup);
        // Add to available groups (user doesn't belong to it yet)
        this.availableGroups.push(newGroup);
        this.filteredAvailableGroups.push(newGroup);
        
        Swal.fire('Succès', `Groupe "${groupData.name}" créé avec succès`, 'success');
      },
      error: (error) => {
        console.error('Error creating user group:', error);
        Swal.fire('Erreur', 'Impossible de créer le groupe', 'error');
      }
    });
  }

  // -------------------- PHONE --------------------

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
      });
  }

  private validatePhone(control: AbstractControl): ValidationErrors | null {
    if (!this.iti || !control.value) return null;
    return this.iti.isValidNumber() ? null : { pattern: true };
  }

  // -------------------- SUBMIT --------------------

  onSubmit(): void {
    if (this.userForm.invalid || this.isSubmitting) return;
    
    if (!this.iti) {
      Swal.fire('Erreur', 'Le champ téléphone n\'est pas initialisé. Veuillez patienter un instant.', 'error');
      return;
    }

    this.isSubmitting = true;

    const value = this.userForm.value;

    const payload = {
      name: value.name!,
      email: value.email!,
      phone: this.iti.getNumber(),
      phoneCountry: this.iti.getSelectedCountryData()?.iso2,
      password: value.password || undefined,
      profileImage: this.imageBase64 || undefined,
      role: value.role!,
      groupIds: this.selectedUserGroupIds || []
    };

    const request$ = this.data.userId
      ? this.httpService.UpdateUserById(this.data.userId, payload)
      : this.httpService.addUser(payload);

    request$.subscribe({
      next: () => {
        Swal.fire({
          title: 'Succès',
          text: 'Utilisateur enregistré avec succès',
          icon: 'success',
          showConfirmButton: false,
          timer: 1500
        }).then(() => this.dialogRef.close(true));
      },
      error: () => {
        Swal.fire('Erreur', 'Opération échouée', 'error');
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    if (this.userForm.dirty || this.memberGroups.length > 0) {
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
    Swal.fire({
      title: 'Supprimer la photo?',
      text: 'Cette action est irréversible',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.imagePreview = null;
        this.imageBase64 = '';
        this.fileInput.nativeElement.value = '';
      }
    });
  }

  // -------------------- ERROR HANDLING --------------------

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

  get hasPhoto(): boolean {
    return !!this.imagePreview || this.hasExistingImage;
  }

  get isPhotoChanged(): boolean {
    return this.imageBase64 !== this.originalImageBase64;
  }
}