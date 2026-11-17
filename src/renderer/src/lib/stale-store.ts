import { create } from 'zustand';

interface StaleState {
  // Reads currently showing a saved copy, with when the server gave it.
  stale: Record<string, string>;
  markStale: (key: string, fetchedAt: string) => void;
  markFresh: (key: string) => void;
}

export const useStaleStore = create<StaleState>()((set) => ({
  stale: {},
  markStale: (key, fetchedAt) =>
    set((state) => ({ stale: { ...state.stale, [key]: fetchedAt } })),
  markFresh: (key) =>
    set((state) => {
      if (!(key in state.stale)) return state;
      const { [key]: _removed, ...rest } = state.stale;
      return { stale: rest };
    }),
}));
