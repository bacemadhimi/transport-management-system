import { ICustomer } from "./customer";

export interface IOrder {
  id: number;
  customerId: number;
  customerName: string;
  customerMatricule: string;
  reference: string;
  type: string;
  weight: number;
  status: OrderStatus;
  createdDate: Date;
   deliveryDate?: Date | string;
  deliveryAddress?: string;
  notes?: string;
  priority: number;
  hasDelivery?: boolean;
  customer?: ICustomer;
  sourceSystem?: string; 
}
export interface CreateOrderDto {
  customerId: number;
  reference?: string;
  type: string;
  weight: number;
  deliveryAddress?: string;
  notes?: string;
  priority: number;
  status?: OrderStatus;
}

export interface UpdateOrderDto {
  customerId?: number;
  type?: string;
  weight?: number;
  status?: OrderStatus;
  deliveryAddress?: string;
  notes?: string;
  priority?: number;
  
}

export enum OrderStatus {
  Pending = 'pending',          // En attente
  ReadyToLoad = 'readyToLoad',  // Prête au chargement
  InProgress = 'inProgress',    // En cours de livraison
  Received = 'received',        // Réception
  Closed = 'closed',            // Clôturée
  Cancelled = 'cancelled'       // Annulée
}

export function getOrderStatusText(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.Pending:
      return 'En attente';
    case OrderStatus.ReadyToLoad:
      return 'Prête au chargement';
    case OrderStatus.InProgress:
      return 'En cours de livraison';
    case OrderStatus.Received:
      return 'Réception';
    case OrderStatus.Closed:
      return 'Clôturée';
    case OrderStatus.Cancelled:
      return 'Annulée';
    default:
      return String(status);
  }
}


// Helper function to get status CSS class
export function getOrderStatusClass(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.Pending:
      return 'status-pending';
    case OrderStatus.ReadyToLoad:
      return 'status-ready';
    case OrderStatus.InProgress:
      return 'status-in-progress';
    case OrderStatus.Received:
      return 'status-received';
    case OrderStatus.Closed:
      return 'status-closed';
    case OrderStatus.Cancelled:
      return 'status-cancelled';
    default:
      return '';
  }
}
