import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { decodeToken } from '@/features/auth/decode-token';
import type { AuthState } from '@/features/auth/types';

export const AUTH_STORAGE_KEY = 'auth';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      signIn: (token) => {
        const user = decodeToken(token);
        set(user ? { token, user } : { token: null, user: null });
      },
      signOut: () => set({ token: null, user: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ token: state.token }),
      merge: (persisted, current) => {
        const token = (persisted as { token?: string | null } | undefined)
          ?.token;
        if (!token) return current;
        const user = decodeToken(token);
        return user ? { ...current, token, user } : current;
      },
    },
  ),
);
