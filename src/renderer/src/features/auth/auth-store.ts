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
      dbUserId: null,
      signIn: (token, dbUserId = null) => {
        const user = decodeToken(token);
        set(
          user
            ? { token, user, dbUserId }
            : { token: null, user: null, dbUserId: null },
        );
      },
      signOut: () => set({ token: null, user: null, dbUserId: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ token: state.token, dbUserId: state.dbUserId }),
      merge: (persisted, current) => {
        const saved = persisted as
          { token?: string | null; dbUserId?: number | null } | undefined;
        const token = saved?.token;
        // A session saved before the user id was stored cannot start a shift,
        // so it is dropped and the user signs in again.
        if (!token || typeof saved?.dbUserId !== 'number') return current;
        const user = decodeToken(token);
        return user
          ? { ...current, token, user, dbUserId: saved.dbUserId }
          : current;
      },
    },
  ),
);
