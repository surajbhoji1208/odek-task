export type UserRole = 'admin' | 'manager' | 'agent';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}
