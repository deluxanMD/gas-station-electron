import { create } from 'zustand';
import type { SupervisorShiftState } from './types';

// In-memory only: values must survive Back/Next but not an app restart.
export const useSupervisorShiftStore = create<SupervisorShiftState>()(
  (set) => ({
    selectedShiftIds: [],
    setSelectedShiftIds: (selectedShiftIds) => set({ selectedShiftIds }),
  }),
);
