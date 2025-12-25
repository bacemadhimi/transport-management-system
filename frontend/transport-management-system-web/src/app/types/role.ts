export interface IRole {
  id: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
  permissions: Record<string, boolean>;
}