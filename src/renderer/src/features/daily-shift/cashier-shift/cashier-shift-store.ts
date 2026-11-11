import { create } from 'zustand';
import type { CashierShiftState } from './types';

// In-memory only: values must survive Back/Next but not an app restart.
export const useCashierShiftStore = create<CashierShiftState>()((set) => ({
  creditTotals: null,
  setCreditTotals: (creditTotals) => set({ creditTotals }),
  dailySummary: null,
  setDailySummary: (dailySummary) => set({ dailySummary }),
  cashClose: null,
  setCashClose: (cashClose) => set({ cashClose }),
}));
