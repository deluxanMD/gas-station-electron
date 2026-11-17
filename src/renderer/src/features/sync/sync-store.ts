import { create } from 'zustand';
import type { SyncStoreState } from './types';

// Mirrors what the main process reports; it is the source of truth.
export const useSyncStore = create<SyncStoreState>()((set) => ({
  state: null,
  setState: (state) => set({ state }),
}));
