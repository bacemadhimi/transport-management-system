import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Dashboard } from '../../services/dashboard';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Table } from '../../components/table/table';
import { PagedData } from '../../types/paged-data';
@Component({
  selector: 'app-home',
  imports: [MatCardModule,BaseChartDirective, Table],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {

 dashboardService=inject(Dashboard)
ngOnInit(){

}


}
