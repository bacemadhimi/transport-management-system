export interface IOrder {
  id: number;
  reference: string;
  weight: number;
  customerId: number;
  status: string;
  type: string;
}