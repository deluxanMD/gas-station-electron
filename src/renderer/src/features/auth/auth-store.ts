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
      shiftId: null,
      signIn: (token, shiftId = null) => {
        const user = decodeToken(token);
        set(
          user
            ? { token, user, shiftId }
            : { token: null, user: null, shiftId: null },
        );
      },
      signOut: () => set({ token: null, user: null, shiftId: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({ token: state.token, shiftId: state.shiftId }),
      merge: (persisted, current) => {
        const saved = persisted as
          { token?: string | null; shiftId?: number | null } | undefined;
        const token = saved?.token;
        if (!token) return current;
        const user = decodeToken(token);
        return user
          ? { ...current, token, user, shiftId: saved?.shiftId ?? null }
          : current;
      },
    },
  ),
);
