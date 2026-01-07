import { Component, EventEmitter, Input, Output, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { PagedData } from '../../types/paged-data';
import { MatPaginator } from "@angular/material/paginator";

@Component({
  selector: 'app-table',
  imports: [MatTableModule, MatCardModule, MatButtonModule, MatButtonModule, MatPaginator],
  templateUrl: './table.html',
  styleUrl: './table.scss'
})
export class Table {
  @Input() PagedData!: PagedData<any>;
  @Input() displayedColumns: any[] = [];
  @Output() onEdit = new EventEmitter<any>();
  @Output() onEnable = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() onPageChange = new EventEmitter<any>();
  @Output() rowClick = new EventEmitter<any>();
  @Input() pageIndex!: number;
  @Input() pageSize!: number;
  @Input() showPage= true;
  cols: any[] = []
  ngOnInit() {
    this.cols = this.displayedColumns.map(x => x.key || x)
  }
  edit(rowData: any) {
    this.onEdit.emit(rowData);
  }
   enable(rowData: any) {
    this.onEnable.emit(rowData);
  }
  delete(rowData: any) {
    this.onDelete.emit(rowData);
  }
  pageChange(event: any) {
    console.log(event);
    this.onPageChange.emit(event);
  }
  onButtonClick(btn:string,rowData:any) {
this.rowClick.emit({
btn,
rowData,
});
  }
  
}