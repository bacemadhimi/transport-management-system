import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';

import { StatisticsService } from '../../services/statistics.service';
import { ChartService } from '../../services/chart.service';
import { 
  StatisticsFilter, 
  TripStatistics,
  PieChartData
} from '../../types/pie-chart-data.model';
import { ITruck } from '../../types/truck';
import { IDriver } from '../../types/driver';


@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss']
})
export class StatisticsComponent implements OnInit, AfterViewInit, OnDestroy {
  // Propriétés des filtres
  filter: StatisticsFilter = {};
  startDate: string = '';
  endDate: string = '';

  // Données des listes déroulantes
  trucks: ITruck[] = [];
  drivers: IDriver[] = [];
  filteredTrucks: ITruck[] = [];
  filteredDrivers: IDriver[] = [];
  inactiveTrucks: ITruck[] = [];
  unavailableDrivers: IDriver[] = [];
  
  // États de chargement
  loadingTrucks = false;
  loadingDrivers = false;
  loadingStatistics = false;

  // Données statistiques
  statisticsData: TripStatistics = {
    statusDistribution: [],
    truckUtilization: [],
    deliveryByType: [],
    generatedAt: new Date()
  };

  // État de l'interface
  activeChart: 'status' | 'trucks' | 'delivery' = 'status';
  showHelp = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Données du tableau
  tableData: any[] = [];

  // Données du graphique
  chartLabels: string[] = [];
  chartValues: number[] = [];
  chartColors: string[] = [];
  chartCounts: number[] = [];

  // Statistiques rapides
  quickStats = {
    totalTrips: 0,
    planned: 0,  
    completed: 0,
    deliveryInProgress: 0,
    cancelled: 0,
    averageDeliveryTime: '0h',
    totalDistance: 0,
    totalTrucks: 0,
    activeDrivers: 0,
    loadingInProgress: 0,
    accepted:0,
  };

  // Palettes de couleurs
  private colorPalettes = {
    status: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e07bff', '#e74a3b', '#6f42c1'], // Couleur supplémentaire ajoutée
    trucks: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#6f42c1', '#b541f8', '#fd7e14'],
    delivery: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#5a5c69', '#6f42c1', '#203fc9']
  };

  // Abonnements
  private subscriptions: Subscription = new Subscription();
  private resizeTimer: any;

  constructor(
    private statisticsService: StatisticsService,
    private chartService: ChartService
  ) {}

  ngOnInit(): void {
    this.initializeDates();
    this.setupResizeListener();
    this.loadDropdownData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.loadStatistics();
    }, 100);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize.bind(this));
    }
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.chartService.destroyAllCharts();
  }

  // ========== MÉTHODES D'INITIALISATION ==========

  private initializeDates(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.startDate = this.formatDate(firstDay);
    this.endDate = this.formatDate(today);
  }

  private setupResizeListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize.bind(this));
    }
  }

  private handleResize(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => {
      this.refreshChart();
    }, 250);
  }

  // ========== CHARGEMENT DES LISTES DÉROULANTES ==========

  loadDropdownData(): void {
    this.loadTrucks();
    this.loadDrivers();
  }

  loadTrucks(): void {
    this.loadingTrucks = true;
    const subscription = this.statisticsService.getTrucks().subscribe({
      next: (trucks) => {
        this.trucks = trucks;
        this.filteredTrucks = trucks.filter(truck => truck.status === 'active');
        this.inactiveTrucks = trucks.filter(truck => truck.status !== 'active');
        this.loadingTrucks = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des camions:', error);
        this.errorMessage = 'Échec du chargement de la liste des camions';
        this.loadingTrucks = false;
      }
    });
    this.subscriptions.add(subscription);
  }

  loadDrivers(): void {
    this.loadingDrivers = true;
    const subscription = this.statisticsService.getDrivers().subscribe({
      next: (drivers) => {
        this.drivers = drivers;
        this.filteredDrivers = drivers.filter(driver => driver.status === 'available');
        this.unavailableDrivers = drivers.filter(driver => driver.status !== 'available');
        this.loadingDrivers = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des chauffeurs:', error);
        this.errorMessage = 'Échec du chargement de la liste des chauffeurs';
        this.loadingDrivers = false;
      }
    });
    this.subscriptions.add(subscription);
  }

  // ========== CHARGEMENT DES STATISTIQUES ==========

  loadStatistics(): void {
    if (this.loadingStatistics) return;

    this.loadingStatistics = true;
    this.errorMessage = '';
    this.successMessage = '';

    const filter: StatisticsFilter = {
      startDate: this.startDate ? new Date(this.startDate) : undefined,
      endDate: this.endDate ? new Date(this.endDate) : undefined,
      truckId: this.filter.truckId,
      driverId: this.filter.driverId
    };

    // Option 1: Obtenir toutes les statistiques en une fois
    this.statisticsService.getTripStatistics(filter).subscribe({
      next: (data) => {
        this.statisticsData = data;
        this.processStatisticsData();
        this.updateTable();
        this.updateChart();
        this.updateQuickStats();
        
        this.successMessage = `${this.getTotalCount()} enregistrements chargés avec succès`;
        this.loadingStatistics = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
        this.errorMessage = 'Échec du chargement des statistiques. Veuillez réessayer.';
        this.loadingStatistics = false;
        this.showEmptyState();
      }
    });

    // OU Option 2: Obtenir des statistiques individuelles selon le graphique actif
    // this.loadChartData();
  }

  // Méthode pour charger des données de graphique spécifiques
  private loadChartData(): void {
    const filter: StatisticsFilter = {
      startDate: this.startDate ? new Date(this.startDate) : undefined,
      endDate: this.endDate ? new Date(this.endDate) : undefined,
      truckId: this.filter.truckId,
      driverId: this.filter.driverId
    };

    let observable: Observable<PieChartData[]>;

    switch (this.activeChart) {
      case 'status':
        observable = this.statisticsService.getTripStatusDistribution(filter);
        break;
      case 'trucks':
        observable = this.statisticsService.getTruckUtilization(filter);
        break;
      case 'delivery':
        observable = this.statisticsService.getOrdersByType(filter);
        break;
      default:
        observable = this.statisticsService.getTripStatusDistribution(filter);
    }

    observable.subscribe({
      next: (data) => {
        // Mettre à jour les données du graphique spécifique
        this.updateChartData(data);
        this.updateTableFromData(data);
        this.updateChart();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données du graphique:', error);
        this.showEmptyChart();
      }
    });
  }

  private updateChartData(data: PieChartData[]): void {
    switch (this.activeChart) {
      case 'status':
        this.statisticsData.statusDistribution = data;
        break;
      case 'trucks':
        this.statisticsData.truckUtilization = data;
        break;
      case 'delivery':
        this.statisticsData.deliveryByType = data;
        break;
    }
  }

  private updateTableFromData(data: PieChartData[]): void {
    this.tableData = data.map((item, index) => ({
      id: index + 1,
      status: item.label,
      count: item.count,
      percentage: item.value,
      color: item.color,
      trend: this.calculateTrend(index),
      icon: this.getStatusIcon(item.label),
      description: this.getStatusDescription(item.label)
    }));
  }

  private processStatisticsData(): void {
    this.statisticsData.statusDistribution = this.ensureColors(
      this.statisticsData.statusDistribution,
      this.colorPalettes.status
    );
    
    this.statisticsData.truckUtilization = this.ensureColors(
      this.statisticsData.truckUtilization,
      this.colorPalettes.trucks
    );
    
    this.statisticsData.deliveryByType = this.ensureColors(
      this.statisticsData.deliveryByType,
      this.colorPalettes.delivery
    );
  }

  private ensureColors(data: any[], palette: string[]): any[] {
    return data.map((item, index) => ({
      ...item,
      color: item.color || palette[index % palette.length]
    }));
  }

  // ========== MÉTHODES DE GRAPHIQUE ==========

  updateChart(): void {
    let chartData: any[] = [];
    
    switch (this.activeChart) {
      case 'status':
        chartData = this.statisticsData.statusDistribution;
        break;
      case 'trucks':
        chartData = this.statisticsData.truckUtilization;
        break;
      case 'delivery':
        chartData = this.statisticsData.deliveryByType;
        break;
    }

    if (chartData.length === 0) {
      this.showEmptyChart();
      return;
    }

    this.chartLabels = chartData.map(d => d.label);
    this.chartValues = chartData.map(d => d.value);
    this.chartColors = chartData.map(d => d.color);
    this.chartCounts = chartData.map(d => d.count);

    const chartConfig = {
      labels: this.chartLabels,
      values: this.chartValues,
      colors: this.chartColors,
      counts: this.chartCounts,
      title: this.getChartTitle()
    };

    // Détruire tout graphique existant d'abord
    this.chartService.destroyChart('pieChart');
    
    // Créer un nouveau graphique
    this.chartService.createPieChart('pieChart', chartConfig)
      .then(success => {
        if (!success) {
          console.warn('Échec de la création du graphique, affichage du secours HTML');
          this.createHtmlChart();
        }
      })
      .catch(error => {
        console.error('Erreur de création du graphique:', error);
        this.createHtmlChart();
      });
  }

  private showEmptyChart(): void {
    const container = document.querySelector('.chart-container');
    if (container) {
      const canvas = document.getElementById('pieChart') as HTMLCanvasElement;
      if (canvas) {
        canvas.style.display = 'none';
      }
      
      // S'assurer que le message vide est visible
      const emptyMessage = container.querySelector('.empty-chart-message');
      if (emptyMessage) {
        (emptyMessage as HTMLElement).style.display = 'flex';
      }
    }
  }

  // Mettre à jour createHtmlChart pour gérer le canvas
  private createHtmlChart(): void {
    const canvas = document.getElementById('pieChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chartValues.length === 0) {
      this.showEmptyChart();
      return;
    }

    // Masquer le canvas, afficher le secours SVG
    canvas.style.display = 'none';
    
    const container = document.querySelector('.chart-container');
    if (container) {
      const existingFallback = container.querySelector('.html-chart-fallback');
      if (existingFallback) {
        existingFallback.remove();
      }
      
      const fallbackDiv = document.createElement('div');
      fallbackDiv.className = 'html-chart-fallback';
      fallbackDiv.innerHTML = this.generateHtmlChart();
      container.appendChild(fallbackDiv);
      
      this.updateChartLegend();
    }
  }

  private generateHtmlChart(): string {
    const total = this.chartValues.reduce((sum, value) => sum + value, 100);
    const centerX = 150;
    const centerY = 150;
    const radius = 120;
    
    let startAngle = 0;
    let svgPaths = '';
    
    this.chartValues.forEach((value, index) => {
      if (value === 0) return;
      
      const percentage = (value / total) * 100;
      const sliceAngle = (percentage / 100) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      
      const startX = centerX + radius * Math.cos(startAngle - Math.PI / 2);
      const startY = centerY + radius * Math.sin(startAngle - Math.PI / 2);
      const endX = centerX + radius * Math.cos(endAngle - Math.PI / 2);
      const endY = centerY + radius * Math.sin(endAngle - Math.PI / 2);
      
      const largeArcFlag = sliceAngle <= Math.PI ? '0' : '1';
      
      svgPaths += `
        <path 
          d="M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z"
          fill="${this.chartColors[index]}"
          stroke="#ffffff"
          stroke-width="2"
          class="chart-slice"
          data-index="${index}"
        />
      `;
      
      startAngle = endAngle;
    });
    
    return `
      <div class="html-chart">
        <svg width="300" height="300" viewBox="0 0 300 300">
          ${svgPaths}
          <circle cx="${centerX}" cy="${centerY}" r="${radius * 0.5}" fill="white" />
          <text x="${centerX}" y="${centerY}" text-anchor="middle" dy="0.3em" 
                font-size="24" font-weight="bold" fill="#2c3e50">
            ${this.getTotalCount()}
          </text>
          <text x="${centerX}" y="${centerY + 20}" text-anchor="middle" 
                font-size="12" fill="#6c757d">
            Total
          </text>
        </svg>
      </div>
    `;
  }

  private updateChartLegend(): void {
    const legendContainer = document.getElementById('chartLegend');
    if (!legendContainer || this.chartLabels.length === 0) return;

    let legendHtml = '';
    
    this.chartLabels.forEach((label, index) => {
      const percentage = this.chartValues[index];
      const count = this.chartCounts[index];
      
      legendHtml += `
        <div class="legend-item" data-index="${index}">
          <span class="legend-color" style="background-color: ${this.chartColors[index]}"></span>
          <span class="legend-label">${label}</span>
          <span class="legend-percentage">${percentage.toFixed(1)}%</span>
          <span class="legend-count">(${count})</span>
        </div>
      `;
    });
    
    legendContainer.innerHTML = legendHtml;
    
    setTimeout(() => {
      const slices = document.querySelectorAll('.chart-slice');
      slices.forEach((slice, index) => {
        slice.addEventListener('mouseover', () => {
          slice.setAttribute('style', 'opacity: 0.8;');
        });
        slice.addEventListener('mouseout', () => {
          slice.setAttribute('style', 'opacity: 1;');
        });
      });
    }, 100);
  }

  private showEmptyState(): void {
    const container = document.getElementById('pieChart');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <i class="fas fa-database"></i>
          </div>
          <h4>Aucune Donnée Disponible</h4>
          <p>Essayez d'ajuster vos filtres ou de sélectionner une période différente</p>
        </div>
      `;
    }
    this.tableData = [];
    this.quickStats = {
      totalTrips: 0,
      completed: 0,
      loadingInProgress: 0,
      deliveryInProgress:0,
      cancelled: 0,
      planned: 0,
      averageDeliveryTime: '0h',
      totalDistance: 0,
      totalTrucks: 0,
      activeDrivers: 0,
      accepted:0,
    };
  }

  refreshChart(): void {
    if (this.loadingStatistics) return;
    this.updateChart();
    this.successMessage = 'Graphique actualisé avec succès';
    setTimeout(() => { this.successMessage = ''; }, 3000);
  }

  // ========== MÉTHODES DE TABLEAU ==========

  updateTable(): void {
    let sourceData: any[] = [];
    
    switch (this.activeChart) {
      case 'status':
        sourceData = this.statisticsData.statusDistribution;
        break;
      case 'trucks':
        sourceData = this.statisticsData.truckUtilization;
        break;
      case 'delivery':
        sourceData = this.statisticsData.deliveryByType;
        break;
    }

    this.tableData = sourceData.map((item, index) => ({
      id: index + 1,
      status: item.label,
      count: item.count,
      percentage: item.value,
      color: item.color,
      trend: this.calculateTrend(index),
      icon: this.getStatusIcon(item.label),
      description: this.getStatusDescription(item.label)
    }));
  }

  private calculateTrend(index: number): any {
    const trends = [
      { value: 12.5, direction: 'up' as const, label: 'En augmentation' },
      { value: 8.2, direction: 'up' as const, label: 'En hausse' },
      { value: -5.3, direction: 'down' as const, label: 'En baisse' },
      { value: 0, direction: 'neutral' as const, label: 'Stable' },
      { value: 15.7, direction: 'up' as const, label: 'En croissance' },
      { value: -3.1, direction: 'down' as const, label: 'En déclin' }
    ];
    return trends[index % trends.length];
  }

  private getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'Planned': 'fa-calendar-check',
      'Accepted': 'fa-check-circle',
      'LoadingInProgress': 'fa-truck-loading',
      'DeliveryInProgress': 'fa-spinner',
      'Receipt': 'fa-check-double', 
      'Cancelled': 'fa-times-circle'
    };
    return icons[status] || 'fa-circle';
  }

  private getStatusDescription(status: string): string {
    const descriptions: { [key: string]: string } = {
      'Planned': 'Trajet planifié mais pas encore démarré',
      'Accepted': 'Le chauffeur a accepté l\'affectation du trajet',
      'LoadingInProgress': 'Les marchandises sont en cours de chargement dans le camion',
      'DeliveryInProgress': 'Trajet actuellement en cours',
      'Receipt': 'Trajet terminé et livré',
      'Cancelled': 'Trajet annulé'
    };
    return descriptions[status] || 'Aucune description disponible';
  }

  // ========== MÉTHODES DE STATISTIQUES RAPIDES ==========

  private updateQuickStats(): void {
    const statusData = this.statisticsData.statusDistribution;
    
    // Fonction d'aide pour obtenir le compte en toute sécurité
    const getCountByLabel = (label: string): number => {
      const item = statusData.find(d => d.label === label);
      return item ? item.count : 0;
    };

    this.quickStats = {
      totalTrips: this.getTotalCount(),
      planned: getCountByLabel('Planned'), 
      completed: getCountByLabel('Receipt'),  
      deliveryInProgress: getCountByLabel('DeliveryInProgress') ,
      loadingInProgress: getCountByLabel('LoadingInProgress'),
      cancelled: getCountByLabel('Cancelled'),
      averageDeliveryTime: this.calculateAverageDeliveryTime(),
      totalDistance: this.calculateTotalDistance(),
      totalTrucks: this.filteredTrucks.length,
      activeDrivers: this.filteredDrivers.length,
      accepted: getCountByLabel('Accepted'),
    };
  }

  private calculateAverageDeliveryTime(): string {
    const times = [2.5, 3.1, 1.8, 4.2, 2.9];
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    return `${avg.toFixed(1)}h`;
  }

  private calculateTotalDistance(): number {
    return this.statisticsData.statusDistribution.reduce((total, item) => {
      return total + (item.count * 150);
    }, 0);
  }

  // ========== MÉTHODES D'INTERACTION DE L'INTERFACE ==========

  switchChart(type: 'status' | 'trucks' | 'delivery'): void {
    if (this.activeChart === type || this.loadingStatistics) return;
    this.activeChart = type;
    this.updateTable();
    this.updateChart();
    this.announceChange(`Passage à la vue ${this.getChartTitle()}`);
  }

  applyFilters(): void {
    if (this.loadingStatistics || !this.isValidDateRange()) return;
    this.loadStatistics();
    this.announceChange('Filtres appliqués avec succès');
  }

  resetFilters(): void {
    this.initializeDates();
    this.filter = {};
    this.loadStatistics();
    this.announceChange('Filtres réinitialisés aux valeurs par défaut');
  }

  exportToCSV(): void {
    if (this.tableData.length === 0) {
      this.errorMessage = 'Aucune donnée à exporter';
      return;
    }

    try {
      const headers = ['ID', 'Statut', 'Nombre', 'Pourcentage', 'Tendance'];
      const csvData = this.tableData.map(item => [
        item.id,
        item.status,
        item.count,
        `${item.percentage.toFixed(2)}%`,
        item.trend.label
      ]);
      
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `statistiques-${this.formatDate(new Date())}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.successMessage = 'Données exportées avec succès au format CSV';
      setTimeout(() => { this.successMessage = ''; }, 3000);
      
    } catch (error) {
      console.error('Erreur d\'exportation:', error);
      this.errorMessage = 'Échec de l\'exportation des données. Veuillez réessayer.';
    }
  }

  printChart(): void {
    if (typeof window === 'undefined') return;
    
    const printContent = document.getElementById('pieChart');
    if (!printContent) {
      this.errorMessage = 'Aucun graphique disponible à imprimer';
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.errorMessage = 'Veuillez autoriser les pop-ups pour imprimer le graphique';
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Statistiques de Transport - ${this.getChartTitle()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .print-header { text-align: center; margin-bottom: 30px; }
            .print-title { font-size: 24px; font-weight: bold; color: #2c3e50; }
            .print-subtitle { color: #6c757d; margin-top: 10px; }
            .print-date { text-align: right; margin-bottom: 20px; color: #6c757d; }
            .print-chart { text-align: center; margin: 30px 0; }
            .print-table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            .print-table th { background: #f8f9fa; padding: 12px; text-align: left; }
            .print-table td { padding: 10px; border-bottom: 1px solid #e9ecef; }
            .print-footer { margin-top: 50px; text-align: center; color: #6c757d; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div class="print-title">${this.getChartTitle()}</div>
            <div class="print-subtitle">Système de Gestion de Transport</div>
          </div>
          <div class="print-date">
            Généré le : ${this.formatGeneratedDate()}
          </div>
          <div class="print-chart">
            ${printContent.innerHTML}
          </div>
          <table class="print-table">
            <thead>
              <tr>
                <th>Statut</th>
                <th>Nombre</th>
                <th>Pourcentage</th>
              </tr>
            </thead>
            <tbody>
              ${this.tableData.map(item => `
                <tr>
                  <td>${item.status}</td>
                  <td>${item.count}</td>
                  <td>${this.formatPercentage(item.percentage)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="print-footer">
            © ${new Date().getFullYear()} Système de Gestion de Transport | Confidentiel
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }

  showAllDetails(): void {
    this.announceChange('Affichage de tous les détails');
  }

  // ========== MÉTHODES D'AIDE ==========

  private isValidDateRange(): boolean {
    if (!this.startDate || !this.endDate) {
      this.errorMessage = 'Veuillez sélectionner les dates de début et de fin';
      return false;
    }
    
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    if (start > end) {
      this.errorMessage = 'La date de début doit être antérieure à la date de fin';
      return false;
    }
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (start < oneYearAgo) {
      this.errorMessage = 'La plage de dates ne peut pas dépasser 1 an';
      return false;
    }
    
    return true;
  }

  private announceChange(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // ========== GETTERS PUBLICS ==========

  getChartTitle(): string {
    switch (this.activeChart) {
      case 'status': return 'Distribution des Statuts de Trajet';
      case 'trucks': return 'Analyse de l\'Utilisation des Camions';
      case 'delivery': return 'Livraison par Type de Produit';
      default: return 'Statistiques de Transport';
    }
  }

  getTotalCount(): number {
    return this.tableData.reduce((sum, item) => sum + item.count, 0);
  }

  getCompletedCount(): number {
    return this.quickStats.completed;
  }

   getAcceptedCount(): number {
    return this.quickStats.accepted;
  }

  getLoadingInProgressCount(): number {
    return this.quickStats.loadingInProgress;
  }

  getCancelledCount(): number {
    return this.quickStats.cancelled;
  }

  getDateRangeDays(): number {
    if (!this.startDate || !this.endDate) return 0;
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  formatGeneratedDate(): string {
    if (!this.statisticsData.generatedAt) return 'Inconnu';
    const date = new Date(this.statisticsData.generatedAt);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getSelectedTruckName(): string {
    if (!this.filter.truckId) return 'Tous les Camions';
    const truck = this.trucks.find(t => t.id === this.filter.truckId);
    return truck ? `${truck.capacity} (${truck.brand})` : 'Camion Sélectionné';
  }

  getSelectedDriverName(): string {
    if (!this.filter.driverId) return 'Tous les Chauffeurs';
    const driver = this.drivers.find(d => d.id === this.filter.driverId);
    return driver ? driver.name : 'Chauffeur Sélectionné';
  }

  // ========== MÉTHODES D'ACCESSIBILITÉ ==========

  getAriaLabelForChart(): string {
    const title = this.getChartTitle();
    const total = this.getTotalCount();
    const items = this.tableData.length;
    
    if (items === 0) {
      return `${title} graphique. Aucune donnée disponible.`;
    }
    
    return `${title} graphique en camembert. ${items} catégories avec ${total} enregistrements totaux.`;
  }

  getAriaLabelForTable(): string {
    const title = this.getChartTitle();
    const total = this.getTotalCount();
    const items = this.tableData.length;
    
    if (items === 0) {
      return `${title} tableau. Aucune donnée disponible.`;
    }
    
    return `${title} tableau de données. ${items} lignes montrant ${total} enregistrements totaux.`;
  }

  // ========== AIDES DE TEMPLATE ==========

  getTruckDisplay(truck: ITruck): string {
    return `${truck.capacity} - ${truck.brand} (${truck.capacity})`;
  }

  getDriverDisplay(driver: IDriver): string {
    return `${driver.name} - ${driver.permisNumber}`;
  }

  getTruckStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'maintenance': return 'status-maintenance';
      case 'inactive': return 'status-inactive';
      default: return '';
    }
  }

  getDriverStatusClass(status: string): string {
    switch (status) {
      case 'available': return 'status-available';
      case 'on_trip': return 'status-ontrip';
      case 'off_duty': return 'status-offduty';
      default: return '';
    }
  }

  // ========== GESTION DES ERREURS ==========

  clearError(): void {
    this.errorMessage = '';
  }

  clearSuccess(): void {
    this.successMessage = '';
  }

  retryLoading(): void {
    this.errorMessage = '';
    this.loadStatistics();
  }

  getPlannedCount(): number {
    return this.quickStats.planned;
  }
}