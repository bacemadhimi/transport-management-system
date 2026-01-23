export interface ILocation {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  zoneId:number;
}

export interface ICreateLocationDto {
  name: string;
  isActive?: boolean;
  zoneId:number;
}

export interface IUpdateLocationDto {
  name?: string;
  isActive?: boolean;
  zoneId:number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}