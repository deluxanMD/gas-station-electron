import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { draftStorage } from '@/lib/draft-storage';
import type { CashierShiftState } from './types';

export const CASHIER_DRAFT_NAME = 'draft-cashier-shift';

// The entered figures are kept as a draft for the shift (see drafts.ts), so a restart in the middle does not lose them.
export const useCashierShiftStore = create<CashierShiftState>()(
  persist(
    (set) => ({
      creditTotals: null,
      setCreditTotals: (creditTotals) => set({ creditTotals }),
      dailySummary: null,
      setDailySummary: (dailySummary) => set({ dailySummary }),
      cashClose: null,
      setCashClose: (cashClose) => set({ cashClose }),
      saving: false,
      setSaving: (saving) => set({ saving }),
      resetShift: () =>
        set({
          creditTotals: null,
          dailySummary: null,
          cashClose: null,
          saving: false,
        }),
    }),
    {
      name: CASHIER_DRAFT_NAME,
      storage: createJSONStorage(() => draftStorage),
      skipHydration: true,
      partialize: ({ creditTotals, dailySummary, cashClose }) => ({
        creditTotals,
        dailySummary,
        cashClose,
      }),
    },
  ),
);
