// availability.ts
import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_FORMATS } from '@angular/material/core';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import { IDriver } from '../../types/driver';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatIconModule } from '@angular/material/icon';
import { PagedData } from '../../types/paged-data';
import { MatSnackBar } from '@angular/material/snack-bar';

interface IDriverAvailability extends IDriver {
  availability: {
    [date: string]: {
      isAvailable: boolean;
      isDayOff: boolean;
      reason?: string;
    };
  };
  dayOffs: string[];
}

interface IDateColumn {
  date: Date;
  label: string;
  dayOfWeek: string;
  isWeekend: boolean;
  isDayOffForAll?: boolean;
}

// French date format
const FR_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [
    CommonModule,
    Table,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule
  ],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: FR_DATE_FORMATS }
  ],
  templateUrl: './availability.html',
  styleUrls: ['./availability.scss']
})
export class AvailabilityComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  httpService = inject(Http);
  private snackBar = inject(MatSnackBar);
  pagedDriverData!: PagedData<IDriverAvailability>;
  totalData!: number;
  
  filter: any = {
    pageIndex: 0,
    pageSize: 10,
    search: ''
  };

  // Dynamic date columns
  dateColumns: IDateColumn[] = [];
  currentWeekStart: Date = new Date();
  weeks: { start: Date; end: Date; label: string }[] = [];
  selectedWeekIndex: number = 0;
  
  // Configuration
  daysToShow: number = 7;
  companyDayOffs: string[] = [];

  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  // We'll use a custom format function that makes cells clickable
  showCols = [
    { 
      key: 'name', 
      label: 'Nom',
      format: (row: any) => `
        <div class="driver-info">
          <div class="driver-name">${row.name}</div>
          <div class="driver-phone">${row.phone}</div>
        </div>
      `
    },
    { 
      key: 'status', 
      label: 'Status',
      format: (row: any) => `
        <span class="status-badge ${row.status?.toLowerCase()}">${row.status}</span>
      `
    },
    ...Array.from({ length: 7 }, (_, i) => ({
      key: `day${i}`,
      label: '',
      format: (row: any) => {
        if (i < this.dateColumns.length) {
          const status = this.getAvailabilityStatus(row, this.dateColumns[i].date);
          const dateCol = this.dateColumns[i];
          const isClickable = !dateCol.isWeekend && !dateCol.isDayOffForAll;
          const clickClass = isClickable ? 'clickable' : 'not-clickable';
          const cellClass = `availability-cell ${clickClass} ${status}-cell`;
          
          let emoji = '';
          switch (status) {
            case 'available': emoji = '✅'; break;
            case 'unavailable': emoji = '❌'; break;
            case 'jour_off': emoji = '🏖️'; break;
            default: emoji = '';
          }
          
          return `
            <div class="${cellClass}" 
                 data-driver-id="${row.id}" 
                 data-date-index="${i}"
                 onclick="window.availabilityComponent?.onCellClick(${row.id}, ${i})">
              ${emoji}
            </div>
          `;
        }
        return '';
      }
    }))
  ];

  ngOnInit() {
    // Expose component to window for onclick events
    (window as any).availabilityComponent = this;
    
    this.initializeWeeks();
    this.getLatestData();
    this.loadCompanyDayOffs();
    
    this.searchControl.valueChanges
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe((value: string | null) => {
        this.filter.search = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    // Clean up window reference
    (window as any).availabilityComponent = null;
  }

  initializeWeeks() {
    const today = new Date();
    this.currentWeekStart = this.getStartOfWeek(today);
    this.generateWeeks(12);
    this.updateDateColumns();
    this.updateTableHeaders();
  }

  generateWeeks(count: number) {
    this.weeks = [];
    const today = new Date();
    
    for (let i = -count; i <= count; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + (i * 7));
      const weekStartDate = this.getStartOfWeek(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
      
      this.weeks.push({
        start: weekStartDate,
        end: weekEndDate,
        label: this.getWeekLabel(weekStartDate, weekEndDate)
      });
    }
    
    this.selectedWeekIndex = count;
  }

  updateTableHeaders() {
    // Update the date columns with date labels
    for (let i = 0; i < this.daysToShow; i++) {
      if (i < this.dateColumns.length) {
        const dateCol = this.dateColumns[i];
        this.showCols[2 + i] = {
          key: `day${i}`,
          label: `${dateCol.label} ${dateCol.dayOfWeek}`,
          format: (row: any) => {
            const status = this.getAvailabilityStatus(row, dateCol.date);
            const isClickable = !dateCol.isWeekend && !dateCol.isDayOffForAll;
            const clickClass = isClickable ? 'clickable' : 'not-clickable';
            const cellClass = `availability-cell ${clickClass} ${status}-cell`;
            
            let emoji = '';
            switch (status) {
              case 'available': emoji = '✅'; break;
              case 'unavailable': emoji = '❌'; break;
              case 'jour_off': emoji = '🏖️'; break;
              default: emoji = '';
            }
            
            return `
              <div class="${cellClass}" 
                   data-driver-id="${row.id}" 
                   data-date-index="${i}"
                   onclick="window.availabilityComponent?.onCellClick(${row.id}, ${i})">
                ${emoji}
              </div>
            `;
          }
        };
      }
    }
  }

  getLatestData() {
    const startDate = this.weeks[this.selectedWeekIndex]?.start || new Date();
    const endDate = this.weeks[this.selectedWeekIndex]?.end || new Date();
    
    const params = {
      ...this.filter,
      startDate: this.formatDateForStorage(startDate),
      endDate: this.formatDateForStorage(endDate)
    };

    this.httpService.getAllDriversAvailability(params).subscribe(
      (result: any) => {
        if (result && result.drivers) {
          this.processAvailabilityData(result.drivers);
          this.totalData = result.totalDrivers || result.drivers.length;
        } else {
          this.loadFallbackData();
        }
      },
      (error) => {
        console.error('Error loading availability:', error);
        this.loadFallbackData();
      }
    );
  }

  processAvailabilityData(data: any[]) {
    const processedData = data.map((driverData: any) => {
      const availability: { [date: string]: { isAvailable: boolean; isDayOff: boolean; reason?: string } } = {};
      
      this.dateColumns.forEach(dateCol => {
        const dateKey = this.formatDateForStorage(dateCol.date);
        availability[dateKey] = {
          isAvailable: false,
          isDayOff: false,
          reason: ''
        };
      });
      
      if (driverData.availability) {
        Object.keys(driverData.availability).forEach(dateKey => {
          if (availability[dateKey]) {
            const availData = driverData.availability[dateKey];
            availability[dateKey] = {
              isAvailable: availData.isAvailable || false,
              isDayOff: availData.isDayOff || false,
              reason: availData.reason || ''
            };
          }
        });
      }
      
      return {
        id: driverData.driverId,
        name: driverData.driverName,
        permisNumber: driverData.permisNumber || '',
        phone: driverData.phone || '',
        phoneCountry: driverData.phoneCountry || '',
        status: driverData.status || '',
        idCamion: driverData.idCamion || 0,
        availability: availability,
        dayOffs: driverData.dayOffs || []
      };
    });

    this.pagedDriverData = {
      data: processedData,
      totalData: processedData.length
    };
  }

  loadFallbackData() {
    this.httpService.getDrivers().subscribe((drivers: IDriver[]) => {
      const processedData = drivers.map(driver => ({
        ...driver,
        availability: this.generateDefaultAvailability(),
        dayOffs: []
      }));

      this.pagedDriverData = {
        data: processedData,
        totalData: processedData.length
      };
    });
  }

  getStartOfWeek(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(date);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  getWeekLabel(start: Date, end: Date): string {
    const startStr = this.formatDateLabel(start);
    const endStr = this.formatDateLabel(end);
    return `${startStr} - ${endStr}`;
  }

  updateDateColumns() {
    const startDate = this.weeks[this.selectedWeekIndex]?.start || new Date();
    this.dateColumns = [];
    
    for (let i = 0; i < this.daysToShow; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const label = this.formatDateLabel(date);
      const dayOfWeek = this.getFrenchDayOfWeek(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isDayOffForAll = this.isCompanyDayOff(date);
      
      this.dateColumns.push({
        date: new Date(date),
        label: label,
        dayOfWeek: dayOfWeek,
        isWeekend: isWeekend,
        isDayOffForAll: isDayOffForAll
      });
    }
    
    this.updateTableHeaders();
  }

  formatDateLabel(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = this.getFrenchMonth(date.getMonth()).substring(0, 3).toUpperCase();
    return `${day} ${month}`;
  }

  getFrenchDayOfWeek(date: Date): string {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[date.getDay()];
  }

  getFrenchMonth(month: number): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month];
  }

  isCompanyDayOff(date: Date): boolean {
    const dateStr = this.formatDateForStorage(date);
    return this.companyDayOffs.includes(dateStr);
  }

  loadCompanyDayOffs() {
    this.httpService.getCompanyDayOffs().subscribe(
      (response: any) => {
        if (response && response.dayOffs) {
          this.companyDayOffs = response.dayOffs.map((d: any) => d.date);
        }
        this.updateDateColumns();
      },
      (error) => {
        console.error('Error loading company day offs:', error);
      }
    );
  }

  generateDefaultAvailability(): { [date: string]: { isAvailable: boolean; isDayOff: boolean; reason?: string } } {
    const availability: { [date: string]: { isAvailable: boolean; isDayOff: boolean; reason?: string } } = {};
    
    this.dateColumns.forEach(dateCol => {
      const dateKey = this.formatDateForStorage(dateCol.date);
      const isDayOff = dateCol.isWeekend || dateCol.isDayOffForAll;
      
      availability[dateKey] = {
        isAvailable: !isDayOff,
        isDayOff: isDayOff || false,
        reason: isDayOff ? (dateCol.isWeekend ? 'Weekend' : 'Jour férié') : ''
      };
    });
    
    return availability;
  }

  formatDateForStorage(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Week navigation
  previousWeek() {
    if (this.selectedWeekIndex > 0) {
      this.selectedWeekIndex--;
      this.updateDateColumns();
      this.getLatestData();
    }
  }

  nextWeek() {
    if (this.selectedWeekIndex < this.weeks.length - 1) {
      this.selectedWeekIndex++;
      this.updateDateColumns();
      this.getLatestData();
    }
  }

  goToWeek(index: number) {
    this.selectedWeekIndex = index;
    this.updateDateColumns();
    this.getLatestData();
  }

  goToToday() {
    const today = new Date();
    const weekStart = this.getStartOfWeek(today);
    
    const weekIndex = this.weeks.findIndex(week => 
      week.start.getTime() === weekStart.getTime()
    );
    
    if (weekIndex !== -1) {
      this.selectedWeekIndex = weekIndex;
      this.updateDateColumns();
      this.getLatestData();
    }
  }

  // Get availability status for display
  getAvailabilityStatus(driver: IDriverAvailability, date: Date): string {
    const dateKey = this.formatDateForStorage(date);
    const availability = driver.availability[dateKey];
    
    if (!availability) return '';
    
    if (availability.isDayOff) {
      return 'jour_off';
    }
    
    return availability.isAvailable ? 'available' : 'unavailable';
  }

  // Handle cell click from the table
  onCellClick(driverId: number, dateIndex: number) {
    if (dateIndex >= this.dateColumns.length) return;
    
    // Find the driver
    const driver = this.pagedDriverData.data.find(d => d.id === driverId);
    if (!driver) return;
    
    const dateCol = this.dateColumns[dateIndex];
    const dateKey = this.formatDateForStorage(dateCol.date);
    
    // Check if it's a day off (weekend or company holiday)
    if (dateCol.isDayOffForAll || dateCol.isWeekend) {
      this.snackBar.open(`Impossible de modifier la disponibilité pour un jour off (${dateCol.label})`, 'OK', {
        duration: 3000,
        panelClass: 'error-snackbar'
      });
      return;
    }
    
    const availability = driver.availability[dateKey];
    if (!availability) return;
    
    // Toggle the availability
    const newAvailability = !availability.isAvailable;
    availability.isAvailable = newAvailability;
    
    // Force table refresh by creating a new reference
    this.pagedDriverData = {
      ...this.pagedDriverData,
      data: [...this.pagedDriverData.data]
    };
    
    // Save to backend
    this.httpService.updateDriverAvailability(driverId, {
      date: dateKey,
      isAvailable: newAvailability,
      isDayOff: false,
      reason: newAvailability ? '' : 'Modifié manuellement'
    }).subscribe({
      next: () => {
        this.snackBar.open(
          `Disponibilité de ${driver.name} pour le ${dateCol.label} mise à jour: ${newAvailability ? 'Disponible' : 'Indisponible'}`,
          'OK',
          { duration: 2000 }
        );
      },
      error: (error) => {
        console.error('Error updating availability:', error);
        // Revert on error
        availability.isAvailable = !newAvailability;
        this.pagedDriverData = {
          ...this.pagedDriverData,
          data: [...this.pagedDriverData.data]
        };
        this.snackBar.open('Erreur lors de la mise à jour de la disponibilité', 'OK', {
          duration: 3000,
          panelClass: 'error-snackbar'
        });
      }
    });
  }

  // Handle row click from the table (for action buttons if any)
  onRowClick(event: any) {
    // This handles any action buttons in the table
    if (event.btn) {
      // Handle button clicks if needed
    }
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  // Export functions
  exportCSV() {
    const headers = ['Nom', 'Téléphone', 'Status', ...this.dateColumns.map(d => `${d.label} ${d.dayOfWeek}`)];
    
    const csvContent = [
      headers,
      ...(this.pagedDriverData?.data || []).map(driver => [
        driver.name,
        driver.phone,
        driver.status,
        ...this.dateColumns.map(dateCol => {
          const status = this.getAvailabilityStatus(driver, dateCol.date);
          switch (status) {
            case 'available': return 'Disponible';
            case 'unavailable': return 'Indisponible';
            case 'jour_off': return 'Jour Off';
            default: return '';
          }
        })
      ])
    ]
      .map(e => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `disponibilite_chauffeurs_${this.getWeekLabel(this.weeks[this.selectedWeekIndex].start, this.weeks[this.selectedWeekIndex].end)}.csv`;
    link.click();
  }

  exportExcel() {
    const data = (this.pagedDriverData?.data || []).map(driver => {
      const row: any = {
        'Nom': driver.name,
        'Téléphone': driver.phone,
        'Status': driver.status
      };
      
      this.dateColumns.forEach((dateCol, index) => {
        const status = this.getAvailabilityStatus(driver, dateCol.date);
        row[`${dateCol.label} ${dateCol.dayOfWeek}`] = status === 'available' ? 'Disponible' : 
                                                       status === 'unavailable' ? 'Indisponible' : 
                                                       status === 'jour_off' ? 'Jour Off' : '';
      });
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { 'Disponibilité': worksheet },
      SheetNames: ['Disponibilité']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, `disponibilite_chauffeurs_${this.getWeekLabel(this.weeks[this.selectedWeekIndex].start, this.weeks[this.selectedWeekIndex].end)}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF('landscape');
    
    const headers = ['Nom', 'Téléphone', 'Status', ...this.dateColumns.map(d => `${d.label} ${d.dayOfWeek}`)];
    const body = (this.pagedDriverData?.data || []).map(driver => [
      driver.name,
      driver.phone,
      driver.status,
      ...this.dateColumns.map(dateCol => {
        const status = this.getAvailabilityStatus(driver, dateCol.date);
        return status === 'available' ? '✓' : 
               status === 'unavailable' ? '✗' : 
               status === 'jour_off' ? '○' : '';
      })
    ]);

    doc.setFontSize(10);
    doc.text(`Disponibilité des Chauffeurs - ${this.getWeekLabel(this.weeks[this.selectedWeekIndex].start, this.weeks[this.selectedWeekIndex].end)}`, 14, 10);

    autoTable(doc, {
      startY: 15,
      head: [headers],
      body: body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { left: 14, right: 14 }
    });

    doc.save(`disponibilite_chauffeurs_${this.getWeekLabel(this.weeks[this.selectedWeekIndex].start, this.weeks[this.selectedWeekIndex].end)}.pdf`);
  }

  // Get total available drivers for a date
  getTotalAvailableForDate(date: Date): number {
    const dateKey = this.formatDateForStorage(date);
    return (this.pagedDriverData?.data || []).filter(driver => {
      const availability = driver.availability[dateKey];
      return availability && !availability.isDayOff && availability.isAvailable;
    }).length;
  }
}