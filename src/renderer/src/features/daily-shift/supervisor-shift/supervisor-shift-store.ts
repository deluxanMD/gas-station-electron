import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { draftStorage } from '@/lib/draft-storage';
import type { SupervisorShiftState } from './types';

export const SUPERVISOR_DRAFT_NAME = 'draft-supervisor-shift';

// The entered figures are kept as a draft for the shift (see drafts.ts). The reviewed cashier shifts are not: they
// come from the server and are read again.
export const useSupervisorShiftStore = create<SupervisorShiftState>()(
  persist(
    (set) => ({
      selectedShiftIds: [],
      setSelectedShiftIds: (selectedShiftIds) => set({ selectedShiftIds }),
      consolidated: null,
      setConsolidated: (consolidated) => set({ consolidated }),
      fuel: null,
      setFuel: (fuel) => set({ fuel }),
      fuelDelivery: null,
      setFuelDelivery: (fuelDelivery) => set({ fuelDelivery }),
      fuelDips: null,
      setFuelDips: (fuelDips) => set({ fuelDips }),
    }),
    {
      name: SUPERVISOR_DRAFT_NAME,
      storage: createJSONStorage(() => draftStorage),
      skipHydration: true,
      partialize: ({ fuel, fuelDelivery, fuelDips }) => ({
        fuel,
        fuelDelivery,
        fuelDips,
      }),
    },
  ),
);
