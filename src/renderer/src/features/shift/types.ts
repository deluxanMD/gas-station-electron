import type { LocalShift } from '@/lib/ipc';

// A shift as this device knows it; `id` is null until the server has confirmed the start.
export type Shift = LocalShift;

// A shift as the server reports it (lists, and the open shift of a user).
export interface ServerShift {
  id: number;
  // Null for a shift started before devices made their own ids.
  clientId: string | null;
  // The API's numeric id of the user who owns the shift.
  userId: number;
  startTime: string;
  endTime: string | null;
}

export interface ShiftWithUser extends ServerShift {
  userName: string;
}

// A shift in a review list. It can be on the server, on this device only (not sent yet), or both.
export interface ReviewShift {
  // Stable id for selecting it: the server id, else the device's own.
  key: string;
  id: number | null;
  clientId: string | null;
  userId: number;
  userName: string;
  startTime: string;
  endTime: string | null;
  // True when this device holds the shift's records, so totals can be summed here.
  onDevice: boolean;
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
  // The `key` of each reviewed shift.
  shiftIds: string[];
  // Shifts missing some cashier records; they count as zero.
  incompleteShiftIds: string[];
  creditTotals: ConsolidatedCreditTotals;
  dailySummary: ConsolidatedDailySummary;
  payoutsAndCash: ConsolidatedPayoutsAndCash;
}
