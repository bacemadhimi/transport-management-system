import { IDriver } from "./driver";
import { ITruck } from "./truck";

export interface ITrip {
  id: number;
  customerId: number;
  customer?: ICustomer;
  tripStartDate: string;
  tripEndDate: string;
  tripType: string;
  truckId: number;
  truck?: ITruck;
  driverId: number;
  driver?: IDriver;
  tripStartLocation: string;
  tripEndLocation: string;
  approxTotalKM?: number;
  tripStatus: string;
  startKmsReading: number;
  bookingId?: string;
}
export interface ICustomer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const TripTypeOptions = [
  { value: 'SingleTrip', label: 'Voyage Simple' },
  { value: 'RoundTrip', label: 'Aller-Retour' }
];

export const TripStatusOptions = [
  { value: 'Booked', label: 'Réservé' },
  { value: 'YetToStart', label: 'Pas Encore Commencé' },
  { value: 'TripStarted', label: 'Voyage Débuté' },
  { value: 'Loading', label: 'Chargement' },
  { value: 'InTransit', label: 'En Transit' },
  { value: 'ArrivedToDestination', label: 'Arrivé à Destination' },
  { value: 'Unloading', label: 'Déchargement' },
  { value: 'Completed', label: 'Terminé' },
  { value: 'TripCancelled', label: 'Voyage Annulé' },
  { value: 'AcceptedByDriver', label: 'Accepté par le Chauffeur' },
  { value: 'RejectedByDriver', label: 'Refusé par le Chauffeur' }
];