export interface ITruck {
  id: number;
  immatriculation: string;
  brand: string;
  capacity: number; // Capacité totale en kg
  capacityUnit?: string; // "kg" ou "tonnes"
  currentLoad?: number; // Charge actuelle
  loadType?: 'palettes' | 'cartons' | 'poid'; // Type de chargement
  technicalVisitDate: string | null;
  status: string;
  color: string;
  imageBase64: string | null;
}
