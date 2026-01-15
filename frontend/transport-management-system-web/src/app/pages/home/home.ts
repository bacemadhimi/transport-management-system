import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common'; // ✅ pour *ngIf
import { Dashboard } from '../../services/dashboard';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Table } from '../../components/table/table';
import { PagedData } from '../../types/paged-data';

interface ITripByTruck {
  truckImmatriculation: string;
  tripCount: number;
}

interface ITodayTrip {
  tripId: number;
  driverName: string;
  truckImmatriculation: string;
  customerName: string;
  tripStart: string;
  tripEnd: string;
  tripStatus: string;
  approxTotalKM?: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [MatCardModule, BaseChartDirective, Table, CommonModule], // ✅ CommonModule ajouté
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit {

  userCount!: number;
  driverCount!: number;
  truckCount!: number;

  public barChartLegend = true;
  public barChartPlugins = [];

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{ data: [], label: 'Nombre de trajets par camion' }]
  };

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
  };

  tripByTruckData!: PagedData<ITripByTruck>;
  todayTripData!: PagedData<ITodayTrip>;

  todayTripCols = [
    { key: 'driverName', label: 'Chauffeur' },
    { key: 'truckImmatriculation', label: 'Camion' },
    { key: 'customerName', label: 'Client' },
    { key: 'tripStart', label: 'Départ' },
    { key: 'tripEnd', label: 'Arrivée' },
    { key: 'tripStatus', label: 'Statut' },
    { key: 'approxTotalKM', label: 'Km approximatif' }
  ];

  tripByTruckCols = [
    { key: 'truckImmatriculation', label: 'Camion' },
    { key: 'tripCount', label: 'Nombre de trajets' }
  ];

  dashboardService = inject(Dashboard);

  ngOnInit() {
    this.dashboardService.getDashboardData().subscribe(result => {
      this.userCount = result.userCount;
      this.driverCount = result.driverCount;
      this.truckCount = result.truckCount;
    });
    this.dashboardService.getTripsByTruck().subscribe(result => {
      this.barChartData.labels = result.map(x => x.truckImmatriculation);
      this.barChartData.datasets[0].data = result.map(x => x.tripCount);
      this.tripByTruckData = { data: result, totalData: result.length };
    });

    this.dashboardService.getTodayTrips().subscribe(result => {
      this.todayTripData = { data: result, totalData: result.length };
    });
  }
}
