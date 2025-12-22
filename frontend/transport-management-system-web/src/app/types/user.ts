export interface IUser {
  id: number;
  email: string;
  password?: string;
  role: string;
  name?: string;
  phone?: string;
  profileImage?: string;
  permissions?: string; 
  phoneCountry?: string;
}
