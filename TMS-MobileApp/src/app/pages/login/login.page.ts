import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { IonicModule, IonInput, AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpParams, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';

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
    apiUrl = 'https://localhost:7287/api/Auth/login';
    
    //apiUrl = 'http://192.168.100.120:7287/api/Auth/login';



=======
>>>>>>> 68e20f90abe4a1243fa0ae249b8cbef0bf772155
  constructor(
    private alertCtrl: AlertController,
    private toastCtrl: ToastController, 
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngAfterViewInit() {
   
    this.usernameInput.value = '';
    this.passwordInput.value = '';
  }


  async showToast(message: string, duration = 2000) {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      color: 'success',
      position: 'middle'
    });
    await toast.present();
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
 
   async login() {
  const email = (await this.usernameInput.getInputElement()).value as string;
  const password = (await this.passwordInput.getInputElement()).value as string;

<<<<<<< HEAD
=======
async login() {
  const email = (await this.usernameInput.getInputElement()).value as string;
  const password = (await this.passwordInput.getInputElement()).value as string;

>>>>>>> 68e20f90abe4a1243fa0ae249b8cbef0bf772155
  if (!email || !password) {
    this.showAlert('Erreur', 'Veuillez entrer email et mot de passe');
    return;
  }

<<<<<<< HEAD
  const body = {
    email: email,
    password: password
  };

  this.http.post<any>(this.apiUrl, body).subscribe(
    async (res) => {
      // Save token & user info
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify({
        id: res.id,
        email: res.email,
        roles: res.roles,
        permissions: res.permissions,
        expiry: res.expiry
      }));

      await this.showToast('Connexion réussie !', 1500);

      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 1500);
    },
    async (err) => {
      const msg = err?.error?.message || 'Email ou mot de passe incorrect';
      this.showAlert('Erreur', msg);
    }
  );
}

=======
  this.http.post<any>('https://localhost:7287/api/Auth/login', { email, password })
    .subscribe(async res => {
      
      this.authService.saveToken({
        id: res.id,
        email: res.email,
        token: res.token,
        role: res.roles[0] 
      });

      await this.showToast('Connexion réussie !', 1500);

      this.router.navigateByUrl('/home');

    }, async err => {
      this.showAlert('Erreur', err.error?.message ?? 'Email ou mot de passe incorrect');
    });
}

 

>>>>>>> 68e20f90abe4a1243fa0ae249b8cbef0bf772155
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