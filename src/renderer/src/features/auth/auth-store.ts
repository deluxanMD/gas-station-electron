import { create } from 'zustand';
import type { AuthState } from '@/features/auth/types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  signIn: (user) => set({ user }),
  signOut: () => set({ user: null }),
}));
