export type UserRole =
  'CASHIER' | 'SUPERVISOR' | 'MANAGER' | 'OWNER' | 'DISPATCH' | 'ACCOUNTING';

export interface AuthUser {
  userId: string;
  userRole: UserRole | null;
}

export interface LoginResponse {
  data: { token: string };
}

export interface ErrorResponse {
  message?: string;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  signIn: (token: string) => void;
  signOut: () => void;
}
