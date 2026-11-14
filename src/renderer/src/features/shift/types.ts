export interface Shift {
  id: number;
  // The API's numeric id of the user who owns the shift.
  userId: number;
  startTime: string;
  endTime: string | null;
}

export interface ShiftWithUser extends Shift {
  userName: string;
}

export type CurrentShift =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'none' }
  | { status: 'open'; shift: Shift };

export interface ShiftStoreState {
  current: CurrentShift;
  setCurrent: (current: CurrentShift) => void;
}

export interface UseStartShift {
  start: () => void;
  starting: boolean;
  error: string | null;
}

export interface UseFinishShift {
  finish: () => void;
  closing: boolean;
  error: string | null;
}

// The cashier-entered figures of several shifts, summed by the API (cents).
export interface ConsolidatedCreditTotals {
  creditTerminalCents: number;
  creditTotalCents: number;
  debitTerminalCents: number;
  fleetCents: number;
  svRedemptionCents: number;
}

export interface ConsolidatedDailySummary {
  fuelSalesCents: number;
  itemSalesCents: number;
  gstCents: number;
  hstCents: number;
  pennyRoundingCents: number;
  totalSalesCents: number;
}

export interface ConsolidatedPayoutsAndCash {
  totalPosCents: number;
  totalPayoutsCents: number;
  lottoWinnerCents: number;
  giftCertificatesCents: number;
  redemptionsCents: number;
  safedropsCents: number;
  cashOnHandCents: number;
}

export interface ConsolidatedShifts {
  shiftIds: number[];
  // Shifts missing some cashier records; they count as zero.
  incompleteShiftIds: number[];
  creditTotals: ConsolidatedCreditTotals;
  dailySummary: ConsolidatedDailySummary;
  payoutsAndCash: ConsolidatedPayoutsAndCash;
}
