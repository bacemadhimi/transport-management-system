import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatSidenavModule} from '@angular/material/sidenav';
import { Auth } from './services/auth';
import {MatListModule} from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatToolbarModule, MatButtonModule,MatIconModule,MatSidenavModule,RouterLink,MatListModule,MatIconModule,MatExpansionModule,CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('transport-management-system-web');
  authService =inject(Auth)

  logout(){
    this.authService.logout();
  }
  maintenanceOpen = false;
  ngOnInit() {
    if (this.authService.isLoggedIn) {
      this.authService.loadLoggedInUser();
    }
  }

toggleMaintenance() {
  this.maintenanceOpen = !this.maintenanceOpen;
}

}
