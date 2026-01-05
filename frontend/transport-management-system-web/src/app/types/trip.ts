import { IDriver } from "./driver";
import { ITruck } from "./truck";

// First, add interfaces for locations
export interface ITripLocation {
  address: string;
  sequence: number;
  locationType?: string; // 'Pickup', 'Dropoff', 'Waypoint'
  scheduledTime?: string;
  notes?: string;
}

// Location type enum
export enum LocationType {
  Pickup = 'Pickup',
  Dropoff = 'Dropoff',
  Waypoint = 'Waypoint'
}

// Update ITrip interface to include locations
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
  locations: ITripLocation[]; 
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


export const LocationTypeOptions = [
  { value: 'Pickup', label: 'Ramassage' },
  { value: 'Dropoff', label: 'Livraison' },
  { value: 'Waypoint', label: 'Point de passage' }
];