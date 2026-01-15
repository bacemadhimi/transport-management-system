import { Component, inject, OnInit } from '@angular/core';
import { Auth } from '../../services/auth';
import { MatCardModule } from '@angular/material/card';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatCardModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login implements OnInit {
  authService = inject(Auth);
  fb = inject(FormBuilder);
  router = inject(Router);
  snackBar = inject(MatSnackBar);

  loginForm!: FormGroup;
  isLoading = false;

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });

    if (this.authService.isLoggedIn) {
      this.redirectByRole();
    }
  }

  onLogin() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: (result) => {
        console.log(result);
        this.authService.saveToken(result);
        this.isLoading = false;

        this.redirectByRole(result.roles); // redirection dynamique selon les rôles
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Login error:', error);

        this.snackBar.open(
          'Email ou mot de passe incorrect',
          'Fermer',
          {
            duration: 5000,
            panelClass: ['error-snackbar'],
            verticalPosition: 'bottom',
            horizontalPosition: 'center'
          }
        );
      }
    });
  }

  onForgotPassword() {
    const email = this.loginForm.value.email;

    if (!email) {
      this.snackBar.open(
        "Veuillez entrer votre email pour réinitialiser le mot de passe",
        "Fermer",
        { duration: 4000, horizontalPosition: "center", verticalPosition: "bottom" }
      );
      return;
    }

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.snackBar.open(
          "Un email de réinitialisation a été envoyé",
          "Fermer",
          { duration: 4000 }
        );
      },
      error: () => {
        this.snackBar.open(
          "Cet email n'existe pas",
          "Fermer",
          { duration: 4000 }
        );
      }
    });
  }

  private redirectByRole(roles?: string[]) {
    const userRoles = roles ?? this.authService.authDetail?.roles ?? [];

    if (userRoles.includes('SuperAdmin')) {
      this.router.navigateByUrl('/home');
    } else if (userRoles.includes('Admin')) {
      this.router.navigateByUrl('/admin-dashboard');
    } else {
      // Pour tous les autres rôles dynamiques configurés via la matrice de permissions
      this.router.navigateByUrl('/user-dashboard');
    }
  }
}
