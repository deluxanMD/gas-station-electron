import { create } from 'zustand';
import type { ManagerShiftState } from './types';

// In-memory only: values must survive Back/Next but not an app restart.
export const useManagerShiftStore = create<ManagerShiftState>()((set) => ({
  scratchTickets: null,
  setScratchTickets: (scratchTickets) => set({ scratchTickets }),
  lottoReports: null,
  setLottoReports: (lottoReports) => set({ lottoReports }),
}));
