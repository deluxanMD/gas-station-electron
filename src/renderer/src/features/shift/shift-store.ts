import { create } from 'zustand';
import type { ShiftStoreState } from './types';

// In-memory only: the API is the source of truth and it is re-read after login.
export const useShiftStore = create<ShiftStoreState>()((set) => ({
  current: { status: 'loading' },
  setCurrent: (current) => set({ current }),
}));
