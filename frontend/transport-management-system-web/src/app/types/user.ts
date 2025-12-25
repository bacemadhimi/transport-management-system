
export interface IUser {
  id: number;
  email: string;
  password?: string;
  roleId: number; 
  role?: {
    id: number;
    name: string;
  };
  profileImage?: string;
  name?: string;
  phone?: string;
  phoneCountry?: string;
  createdAt?: Date;
  updatedAt?: Date;
}