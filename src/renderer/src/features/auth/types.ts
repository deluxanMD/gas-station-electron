export interface AuthUser {
  userId: string;
}

export interface LoginResponse {
  data: AuthUser;
}

export interface ErrorResponse {
  message?: string;
}

export interface AuthState {
  user: AuthUser | null;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
}
