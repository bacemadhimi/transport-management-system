import { Component, EventEmitter, Input, Output, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { PagedData } from '../../types/paged-data';
import { MatPaginator } from "@angular/material/paginator";
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-table',
    standalone: true, 
  imports: [MatTableModule, MatCardModule, MatButtonModule, MatButtonModule, MatPaginator, CommonModule],
  templateUrl: './table.html',
  styleUrls: ['./table.scss']  
})
export class Table {
  constructor(public auth: Auth) {}
  
  getActions(row: any, actions: any): string[] {
    return Array.isArray(actions) ? actions : [];
  }
  
  @Input() PagedData!: PagedData<any>;
  @Input() displayedColumns: any[] = [];
  @Output() onEdit = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() onPageChange = new EventEmitter<any>();
  @Output() rowClick = new EventEmitter<any>();
  @Input() pageIndex!: number;
  @Input() pageSize!: number;
  @Input() showPage= true;
  @Input() showApproveButton: boolean = false;


  cols: any[] = []
  ngOnInit() {
    this.cols = this.displayedColumns.map(x => x.key || x)
  }
  edit(rowData: any) {
    this.onEdit.emit(rowData);
  }
  delete(rowData: any) {
    this.onDelete.emit(rowData);
  }
  pageChange(event: any) {
    console.log(event);
    this.onPageChange.emit(event);
  }
onButtonClick(btn: string, rowData: any, event: MouseEvent) {
  event.stopPropagation(); 
  this.rowClick.emit({ btn, rowData });
}

  getStatusText(status: any): string {
  const s = String(status).toLowerCase();
  if (s === 'pending') return 'En attente';
  if (s === 'inprogress') return 'En cours';
  if (s === 'delivered' || s === 'completed') return 'Terminée';
  if (s === 'cancelled') return 'Annulée';
  return status;
}

getStatusClass(status: any): string {
  const s = String(status).toLowerCase();
  if (s === 'pending') return 'status-pending';
  if (s === 'inprogress') return 'status-in-progress';
  if (s === 'delivered' || s === 'completed') return 'status-completed';
  if (s === 'cancelled') return 'status-cancelled';
  return '';
}
canMarkReadyToLoad(order: any): boolean {
  const s = String(order.status).toLowerCase();
  return s !== 'readytoload' && s !== 'closed';
}


}