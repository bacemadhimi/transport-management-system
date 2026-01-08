export interface IUser {
  id: number;
  email: string;
  password?: string;

  userGroups?: { id: number; name: string }[]; // rôles complets
  userGroupIds?: number[];                      // juste les IDs pour le formulaire

  profileImage?: string;
  name?: string;
  phone?: string;
  phoneCountry?: string;

  createdAt?: Date;
  updatedAt?: Date;
}
