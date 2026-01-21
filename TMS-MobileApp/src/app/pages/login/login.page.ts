import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { IonicModule, IonInput, AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpParams, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
<<<<<<< HEAD
 
=======

>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    HttpClientModule,
    RouterModule,
    CommonModule,
    FormsModule
  ]
})
export class LoginPage implements AfterViewInit {
 
  @ViewChild('usernameInput') usernameInput!: IonInput;
  @ViewChild('passwordInput') passwordInput!: IonInput;
<<<<<<< HEAD
 
  //apiUrl = 'http://localhost:5191/api/User';
  apiUrl = 'https://localhost:7287/api/Auth/login';
 
  isLoading = false;
  errorMessage = '';
  showPassword = false;
 
 
=======

  //apiUrl = 'http://localhost:5191/api/User';
 
  apiUrl = 'https://localhost:7287/api/Auth/login';

  isLoading = false;
  errorMessage = '';
  showPassword = false;



>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
  constructor(
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}
 
  ngAfterViewInit() {
    // Clear inputs on page load
    this.usernameInput.value = '';
    this.passwordInput.value = '';
  }
<<<<<<< HEAD
 
=======

>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
  // Toggle password visibility
  togglePassword() {
    this.showPassword = !this.showPassword;
    const input = this.passwordInput;
    if (input) {
      input.type = this.showPassword ? 'text' : 'password';
    }
  }
<<<<<<< HEAD
 
=======

>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
  // Reusable toast method
  async showToast(message: string, duration = 2000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color: 'success',
      position: 'middle'
    });
    await toast.present();
  }
<<<<<<< HEAD
 
=======

>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
  // Reusable alert method
  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
<<<<<<< HEAD
 
  // async login() {
  //   const username = (await this.usernameInput.getInputElement()).value as string;
  //   const password = (await this.passwordInput.getInputElement()).value as string;
 
=======

  // async login() {
  //   const username = (await this.usernameInput.getInputElement()).value as string;
  //   const password = (await this.passwordInput.getInputElement()).value as string;

>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
  //   if (!username || !password) {
  //     this.showAlert('Erreur', 'Veuillez entrer email et mot de passe');
  //     return;
  //   }
<<<<<<< HEAD
 
=======

>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
  //   // Call API to validate user
  //   const params = new HttpParams().set('Search', username);
  //   this.http.get<any>(this.apiUrl, { params }).subscribe(
  //     async res => {
  //       const users = res.data || [];
  //       const user = users.find(
  //         (u: any) => u.email === username && u.password === password
  //       );
<<<<<<< HEAD
 
  //       if (user) {
  //         // Show success toast
  //         await this.showToast('Connexion réussie !', 1500);
 
=======

  //       if (user) {
  //         // Show success toast
  //         await this.showToast('Connexion réussie !', 1500);

>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
  //         // Navigate after toast disappears
  //         setTimeout(() => {
  //           this.router.navigate(['/home']);
  //         }, 1500);
  //       } else {
  //         this.showAlert('Erreur', 'Utilisateur non trouvé ou mot de passe incorrect');
  //       }
  //     },
  //     async () => {
  //       this.showAlert('Erreur', 'Impossible de se connecter au serveur');
  //     }
  //   );
  // }
<<<<<<< HEAD
=======
 
>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
   async login() {
  const email = (await this.usernameInput.getInputElement()).value as string;
  const password = (await this.passwordInput.getInputElement()).value as string;
 
  if (!email || !password) {
    this.errorMessage = 'Please enter both email and password';
    return;
  }
<<<<<<< HEAD
 
  // Clear previous error
  this.errorMessage = '';
  this.isLoading = true;
 
=======

  // Clear previous error
  this.errorMessage = '';
  this.isLoading = true;

>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
  const body = {
    email: email,
    password: password
  };
<<<<<<< HEAD
 
=======

>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
  this.http.post<any>(this.apiUrl, body).subscribe(
    async (res) => {
      // Create auth token object
      const authToken = {
        id: res.id,
        email: res.email,
        token: res.token,
        role: res.roles?.[0] || 'user', // Assuming roles is an array
        permissions: res.permissions || []
      };
<<<<<<< HEAD
 
      // Use auth service to save token
      this.authService.saveToken(authToken);
      console.log('Token saved, isLoggedIn:', this.authService.isLoggedIn());
 
      await this.showToast('Login successful!', 1500);
 
=======

      // Use auth service to save token
      this.authService.saveToken(authToken);
      console.log('Token saved, isLoggedIn:', this.authService.isLoggedIn());

      await this.showToast('Login successful!', 1500);

>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
      setTimeout(() => {
        console.log('Navigating to home...');
        this.router.navigate(['/home']);
      }, 1500);
    },
    async (err) => {
      this.isLoading = false;
      const msg = err?.error?.message || 'Invalid email or password';
      this.errorMessage = msg;
      console.error('Login error:', err);
    }
  );
}
<<<<<<< HEAD
 
=======

>>>>>>> 340376a8dc064c04872d0bb7cff7b3ef9d473fd8
  async quit() {
    const alert = await this.alertCtrl.create({
      header: 'Quitter ?',
      message: 'Vous voulez vraiment quitter ?',
      buttons: [
        { text: 'Non', role: 'cancel' },
        { text: 'Oui', handler: () => window.close() }
      ]
    });
    await alert.present();
  }
}