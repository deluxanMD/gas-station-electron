import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { draftStorage } from '@/lib/draft-storage';
import type { ManagerShiftState } from './types';

export const MANAGER_DRAFT_NAME = 'draft-manager-shift';

// The entered figures are kept as a draft for the shift (see drafts.ts). The reviewed cashier shifts are not: they
// come from the server and are read again.
const INITIAL_STATE = {
  selectedShiftIds: [],
  consolidated: null,
  scratchTickets: null,
  lottoReports: null,
  lottoReconciliation: null,
};

export const useManagerShiftStore = create<ManagerShiftState>()(
  persist(
    (set) => ({
      reset: () => set(INITIAL_STATE),
      selectedShiftIds: [],
      setSelectedShiftIds: (selectedShiftIds) => set({ selectedShiftIds }),
      consolidated: null,
      setConsolidated: (consolidated) => set({ consolidated }),
      scratchTickets: null,
      setScratchTickets: (scratchTickets) => set({ scratchTickets }),
      lottoReports: null,
      setLottoReports: (lottoReports) => set({ lottoReports }),
      lottoReconciliation: null,
      setLottoReconciliation: (lottoReconciliation) =>
        set({ lottoReconciliation }),
    }),
    {
      name: MANAGER_DRAFT_NAME,
      storage: createJSONStorage(() => draftStorage),
      skipHydration: true,
      partialize: ({ scratchTickets, lottoReports, lottoReconciliation }) => ({
        scratchTickets,
        lottoReports,
        lottoReconciliation,
      }),
    },
  ),
);
