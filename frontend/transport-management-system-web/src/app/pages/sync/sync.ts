import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { Http } from '../../services/http';

export interface SyncStatus {
  status: string;
  totalRecords: number;
  processedRecords: number;
}

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatButtonModule,
    MatTableModule   // <-- IMPORTANT
  ],
  templateUrl: './sync.html'
})
export class SyncComponent {

  progress = 0;
  status: SyncStatus | null = null;
  history: any[] = [];

  displayedColumns: string[] = ['date', 'status', 'total', 'processed'];

  constructor(private http: Http) {}

  startSync() {
    this.status = {
      status: 'Running',
      totalRecords: 0,
      processedRecords: 0
    };

    this.http.startSync().subscribe(() => {
      this.updateProgress();
      this.loadHistory();
    });
  }

  updateProgress() {
    const interval = setInterval(() => {
      this.http.getSyncStatus().subscribe((res) => {
        this.status = res;

        if (res.totalRecords > 0) {
          this.progress = Math.round((res.processedRecords / res.totalRecords) * 100);
        }

        if (res.status !== 'Running') {
          clearInterval(interval);
          this.loadHistory();
        }
      });
    }, 1000);
  }

  loadHistory() {
    this.http.getSyncHistory().subscribe((res) => {
      this.history = res;
    });
  }
}
