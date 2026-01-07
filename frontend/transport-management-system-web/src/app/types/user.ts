export interface IUser {
  id: number;
  email: string;
  password?: string;

  userGroupId: number;
  userGroup?: {
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
