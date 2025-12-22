import { Component, inject } from '@angular/core';
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
  imports: [MatCardModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  authService = inject(Auth);
fb = inject(FormBuilder);
 loginForm!: FormGroup;
 router = inject(Router);
  snackBar = inject(MatSnackBar); 
  isLoading = false; 
ngOnInit(){
  this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required],
    });
    if (this.authService.isLoggedIn){
     this.router.navigateByUrl("/");
    }
}
 onLogin() {
    if (this.loginForm.invalid) return;
    
    this.isLoading = true; 
    
    this.authService.login(this.loginForm.value.email, this.loginForm.value.password).subscribe({
      next: (result) => {
        console.log(result);
        this.authService.saveToken(result);
        this.isLoading = false;
        
        if(result.role == "Admin"){
          this.router.navigateByUrl("/home");
        } else {
          this.router.navigateByUrl('/employe-dashboard');
        }
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

}
