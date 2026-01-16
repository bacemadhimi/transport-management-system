import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { IonicModule, IonInput, AlertController } from '@ionic/angular';
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

  apiUrl = 'http://localhost:5191/api/User'; // Your API endpoint

  constructor(
    private alertCtrl: AlertController,
    private http: HttpClient,
    private router: Router
  ) {}

  ngAfterViewInit() {
    // Clear inputs on page load
    this.usernameInput.value = '';
    this.passwordInput.value = '';
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
          const alert = await this.alertCtrl.create({
            header: 'Succès',
            message: 'Connexion réussie !',
            buttons: ['OK']
          });
          await alert.present();
          await alert.onDidDismiss();
          this.router.navigate(['/home']); // Navigate to menu if login success
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

  async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
