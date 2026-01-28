import { Translation } from './services/Translation';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Auth } from './services/auth';
import { Http } from './services/http';


@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    RouterLink,
    MatListModule,
    MatExpansionModule,
    CommonModule,
    HttpClientModule
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {

  protected readonly title = signal('transport-management-system-web');

  authService = inject(Auth);
  httpService = inject(Http);
  private http = inject(HttpClient);
  //  Injection du service de traduction
  private translation = inject(Translation);

  showPermissions = false;
  maintenanceOpen = false;
  userMenuOpen = false;
cancelledTripsCount = 0;
refreshNotificationInterval: any;

 ngOnInit() {
  if (this.authService.isLoggedIn) {
    this.authService.loadLoggedInUser();
  }

  // Start notification polling
  this.loadCancelledTrips();
  this.refreshNotificationInterval = setInterval(() => {
    this.loadCancelledTrips();
  }, 5000);
}
loadCancelledTrips() {
  if (!this.authService.isLoggedIn) {
    this.cancelledTripsCount = 0;
    return;
  }

  this.httpService.getTripsList({ pageIndex: 0, pageSize: 1000 }).subscribe({
    next: (res: any) => {
      this.cancelledTripsCount =
        res?.data?.filter((t: any) => t.tripStatus === 'Cancelled').length ?? 0;
    },
    error: (err) => {
      console.error('Erreur notification:', err);
    }
  });
}


openNotification() {
  alert(`Il y a ${this.cancelledTripsCount} voyages annulés.`);
}

ngOnDestroy() {
  if (this.refreshNotificationInterval) {
    clearInterval(this.refreshNotificationInterval);
  }
}

  toggleMaintenance() {
    this.maintenanceOpen = !this.maintenanceOpen;
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  logout() {
    this.authService.logout();
  }

  //Changer la langue
  changeLanguage(lang: string) {
    this.httpService.getTranslations(lang).subscribe({
      next: (data) => {
        this.translation.setTranslations(data);
        console.log('Translations loaded:', data);
      },
      error: err => console.error('Error loading translations', err)
    });
  }

  //Récupérer la traduction d’une clé
  t(key: string): string {
    return this.translation.t(key);
  }

}
