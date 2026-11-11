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

export interface CashierShiftState {
  creditTotals: CreditTotalsCents | null;
  setCreditTotals: (totals: CreditTotalsCents) => void;
  dailySummary: DailySummaryData | null;
  setDailySummary: (summary: DailySummaryData) => void;
}
