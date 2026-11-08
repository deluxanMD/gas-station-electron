import { create } from 'zustand';
import { decodeToken } from '@/features/auth/decode-token';
import type { AuthState } from '@/features/auth/types';

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  signIn: (token) => {
    const user = decodeToken(token);
    set(user ? { token, user } : { token: null, user: null });
  },
  signOut: () => set({ token: null, user: null }),
}));
