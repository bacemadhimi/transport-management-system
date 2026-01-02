// types/traject.ts
export interface ITraject {
  id: number;
  name: string;
  createdAt?: string; // Add optional createdAt
  updatedAt?: string; // Optional updatedAt if needed
  points: ITrajectPoint[];
}

export interface ITrajectPoint {
  id: number;
  location: string;
  order: number;
  trajectId: number;
}

export interface ICreateTrajectDto {
  name: string;
  points: ICreateTrajectPointDto[];
}

export interface ICreateTrajectPointDto {
  location: string;
  order: number;
}

export interface IUpdateTrajectDto {
  name?: string;
  points?: ICreateTrajectPointDto[];
}

export interface IPagedTrajectData {
  data: ITraject[];
  totalData: number;
}

// Options pour le formulaire
export interface ITrajectFormData {
  trajectId?: number;
}