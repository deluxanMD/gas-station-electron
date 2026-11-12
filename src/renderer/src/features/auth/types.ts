import type { UserRole } from '@/features/auth/constants';
import type { ACCESS } from '@/features/auth/permissions';

export interface AuthUser {
  userId: string;
  userRole: UserRole | null;
}

export interface LoginResponse {
  data: { token: string; shiftId: number };
}

export interface LoginResult {
  token: string;
  shiftId: number;
}

export interface ErrorResponse {
  message?: string;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  // The open shift the API assigned at login; null if unknown (old session).
  shiftId: number | null;
  signIn: (token: string, shiftId?: number | null) => void;
  signOut: () => void;
}

export type ModuleId = keyof typeof ACCESS;

export type ModuleAction<M extends ModuleId> = keyof (typeof ACCESS)[M];

// Every module must define `view`; other actions are named per module.
export type AccessTable = Record<
  string,
  { view: readonly UserRole[] } & Record<string, readonly UserRole[]>
>;
