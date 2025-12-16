export interface ITrip {
  id: number;
  customerName: string;
  tripStartDate: string;
  tripEndDate: string;
  tripType: string;
  truckId: number;
  driverId: number;
  tripStartLocation: string;
  tripEndLocation: string;
  approxTotalKM?: number;
  tripStatus: string;
  startKmsReading: number;
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