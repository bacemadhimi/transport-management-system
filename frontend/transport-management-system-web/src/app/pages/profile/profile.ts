import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    MatCardModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit, AfterViewInit {
  authService = inject(Auth);
  fb = inject(FormBuilder);
  
  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  private iti: any; // intl-tel-input instance
  
  profileForm!: FormGroup;
  imageSrc!: string;
  isSubmitting = false;

  ngOnInit() {
    this.profileForm = this.fb.group({
      email: ['', [Validators.email]],
      profileImage: [''],
      phone: ['', [Validators.required, this.validatePhone.bind(this)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      password: ['']
    });
    
    this.authService.getProfile().subscribe((result: any) => {
      this.profileForm.patchValue({
        email: result.email || '',
        name: result.name || '',
        phone: result.phone || '',
        password: ''
      });
      this.imageSrc = result.profileImage || '';
    });
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
            this.profileForm.get('phone')?.setValue(number);
          });

          // Initialize with existing phone number if available
          setTimeout(() => {
            const currentPhone = this.profileForm.get('phone')?.value;
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

  fileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.imageSrc = reader.result as string;
        this.profileForm.patchValue({
          profileImage: this.imageSrc,
        });
      };
      reader.readAsDataURL(file);
    }
  }

  onUpdate() {
    if (!this.profileForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;
    
    // Prepare data with formatted phone number
    const formData = {
      ...this.profileForm.value,
      phone: this.iti?.getNumber() || this.profileForm.value.phone,
      phoneCountry: this.iti?.getSelectedCountryData()?.iso2
    };

    this.authService.updateProfile(formData).subscribe({
      next: (result) => {
        this.isSubmitting = false;
        alert('Profile modifié');
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.isSubmitting = false;
      }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.profileForm.get(controlName);
    
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
      password: 'Le mot de passe'
    };
    return labels[controlName] || controlName;
  }
}