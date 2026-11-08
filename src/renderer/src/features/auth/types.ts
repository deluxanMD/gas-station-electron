import type { UserRole } from '@/features/auth/constants';
import type { ACCESS } from '@/features/auth/permissions';

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

export type ModuleId = keyof typeof ACCESS;

export type ModuleAction<M extends ModuleId> = keyof (typeof ACCESS)[M];

// Every module must define `view`; other actions are named per module.
export type AccessTable = Record<
  string,
  { view: readonly UserRole[] } & Record<string, readonly UserRole[]>
>;
