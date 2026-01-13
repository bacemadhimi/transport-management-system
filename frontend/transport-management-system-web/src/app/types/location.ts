export interface ILocation {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateLocationDto {
  name: string;
  isActive?: boolean;
}

export interface IUpdateLocationDto {
  name?: string;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}