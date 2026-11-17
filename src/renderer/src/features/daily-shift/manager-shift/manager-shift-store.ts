import { create } from 'zustand';
import type { ManagerShiftState } from './types';

// In-memory only: values must survive Back/Next but not an app restart.
const INITIAL_STATE = {
  selectedShiftIds: [],
  consolidated: null,
  scratchTickets: null,
  lottoReports: null,
  lottoReconciliation: null,
};

export const useManagerShiftStore = create<ManagerShiftState>()((set) => ({
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
  setLottoReconciliation: (lottoReconciliation) => set({ lottoReconciliation }),
}));
