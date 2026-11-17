import type { UserRole } from '@/features/auth/constants';
import type { ACCESS } from '@/features/auth/permissions';

export interface AuthUser {
  userId: string;
  userRole: UserRole | null;
}

export interface LoginResponse {
  data: { token: string; refreshToken: string; id: number };
}

export interface LoginResult {
  token: string;
  // Lets the device send its queued writes after the access token expires.
  refreshToken: string;
  // The API's numeric user id (the token only carries the login name).
  id: number;
}

export interface ErrorResponse {
  message?: string;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  // The API's numeric user id, needed to start and look up shifts.
  dbUserId: number | null;
  signIn: (token: string, dbUserId?: number | null) => void;
  // For an offline sign-in: the token may have expired, so the user is given rather than read from it.
  signInAs: (token: string, user: AuthUser, dbUserId: number) => void;
  signOut: () => void;
}

export type ModuleId = keyof typeof ACCESS;

export type ModuleAction<M extends ModuleId> = keyof (typeof ACCESS)[M];

// Every module must define `view`; other actions are named per module.
export type AccessTable = Record<
  string,
  { view: readonly UserRole[] } & Record<string, readonly UserRole[]>
>;
