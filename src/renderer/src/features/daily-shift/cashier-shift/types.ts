import type { ComponentType } from 'react';

export interface CashierShiftProps {
  // Leaves the flow, e.g. back to the home screen.
  onExit: () => void;
}

// Passed to every step so the shell's Next button can submit a step's form.
export interface ShiftStepProps {
  formId: string;
  onNext: () => void;
}

export interface ShiftStep {
  id: string;
  title: string;
  // Set when the step is a form; Next then submits that form.
  formId?: string;
  component: ComponentType<ShiftStepProps>;
}

export interface UseStepper {
  stepIndex: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  back: () => void;
}

// Money in integer cents.
export interface CreditTotalsCents {
  creditTerminalCents: number;
  creditHostCents: number;
  debitTerminalCents: number;
  fleetCents: number;
  svRedemptionCents: number;
}

export interface DailySummaryData {
  dayEndDate: string; // YYYY-MM-DD
  dayEndTime: string; // HH:mm, 24-hour
  shiftNumber: number;
  // Only set when the cashier changed the prepopulated shift number.
  shiftChangeReason: string;
  fuelSalesCents: number;
  itemSalesCents: number;
  gstCents: number;
  hstCents: number;
  // Can be negative.
  pennyRoundingCents: number;
  totalSalesCents: number;
}

export type PayoutType = 'lotto-payout' | 'vendor' | 'owner' | 'misc';

export interface PayoutEntry {
  description: string;
  type: PayoutType;
  amountCents: number;
}

export interface CashCloseData {
  totalPosCents: number;
  // Card sales differ from the step 1 Credit Totals; a Manager must be alerted.
  posMismatch: boolean;
  payouts: PayoutEntry[];
  lottoWinnerCents: number;
  giftCertificatesCents: number;
  redemptionsCents: number;
  safedropsCents: number;
  cashOnHandCents: number;
}

export interface CashierShiftState {
  creditTotals: CreditTotalsCents | null;
  setCreditTotals: (totals: CreditTotalsCents) => void;
  dailySummary: DailySummaryData | null;
  setDailySummary: (summary: DailySummaryData) => void;
  cashClose: CashCloseData | null;
  setCashClose: (cashClose: CashCloseData) => void;
  // True while the three requests are in flight; blocks a second click.
  saving: boolean;
  setSaving: (saving: boolean) => void;
  // Tables already written by a partly failed save; a retry skips them.
  savedTables: ReadonlySet<keyof CashierShiftSubmission>;
  setSavedTables: (tables: ReadonlySet<keyof CashierShiftSubmission>) => void;
}

// Request bodies for the three tables written when the shift is saved.
// Amounts are in dollars, the unit the API stores.
export interface CreditTotalsPayload {
  shiftId: number;
  userId: number;
  creditTerminal: number;
  creditTotal: number;
  debitTerminal: number;
  fleet: number;
  svRedemption: number;
}

export interface DailySummaryPayload {
  shiftId: number;
  userId: number;
  endDate: string; // ISO 8601 with offset
  fuelSales: number;
  itemSales: number;
  gst: number;
  hst: number;
  pennyRounding: number;
  totalSales: number;
}

export interface PayoutsPayload {
  shiftId: number;
  userId: number;
  totalPos: number;
  lottoPayout: number;
  vendorPayout: number;
  ownerPayout: number;
  miscPayout: number;
  lottoWinner: number;
  giftCertificates: number;
  redemptions: number;
  safedrops: number;
  cashOnHand: number;
}

export interface CashierShiftSubmission {
  creditTotals: CreditTotalsPayload;
  dailySummary: DailySummaryPayload;
  payouts: PayoutsPayload;
}
