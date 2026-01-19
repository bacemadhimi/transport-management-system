import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { IonicModule, IonInput, AlertController, ToastController } from '@ionic/angular';
import { HttpClient, HttpParams, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  apiUrl = 'http://localhost:5191/api/User';

  constructor(
    private alertCtrl: AlertController,
    private toastCtrl: ToastController, 
    private http: HttpClient,
    private router: Router
  ) {}

  ngAfterViewInit() {
    // Clear inputs on page load
    this.usernameInput.value = '';
    this.passwordInput.value = '';
  }

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

  // Reusable alert method
  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async login() {
    const username = (await this.usernameInput.getInputElement()).value as string;
    const password = (await this.passwordInput.getInputElement()).value as string;

    if (!username || !password) {
      this.showAlert('Erreur', 'Veuillez entrer email et mot de passe');
      return;
    }

    // Call API to validate user
    const params = new HttpParams().set('Search', username);
    this.http.get<any>(this.apiUrl, { params }).subscribe(
      async res => {
        const users = res.data || [];
        const user = users.find(
          (u: any) => u.email === username && u.password === password
        );

        if (user) {
          // Show success toast
          await this.showToast('Connexion réussie !', 1500);

          // Navigate after toast disappears
          setTimeout(() => {
            this.router.navigate(['/home']);
          }, 1500);
        } else {
          this.showAlert('Erreur', 'Utilisateur non trouvé ou mot de passe incorrect');
        }
      },
      async () => {
        this.showAlert('Erreur', 'Impossible de se connecter au serveur');
      }
    );
  }

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
