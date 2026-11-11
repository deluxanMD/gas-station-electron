import type { ComponentType } from 'react';
import type {
  CashCloseData,
  CreditTotalsCents,
  DailySummaryData,
} from '@/features/daily-shift/cashier-shift/types';

export interface SupervisorShiftProps {
  // Leaves the flow, e.g. back to the home screen.
  onExit: () => void;
}

// Passed to every step so the shell's Next button can submit a step's form.
export interface SupervisorStepProps {
  formId: string;
  onNext: () => void;
}

export interface SupervisorStep {
  id: string;
  title: string;
  // Set when the step is a form; Next then submits that form.
  formId?: string;
  component: ComponentType<SupervisorStepProps>;
}

export interface UseStepper {
  stepIndex: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  back: () => void;
}

// A shift a cashier has closed, with everything they entered.
export interface ClosedShift {
  id: string;
  shiftNumber: number;
  dayEndDate: string;
  dayEndTime: string;
  creditTotals: CreditTotalsCents;
  dailySummary: DailySummaryData;
  cashClose: CashCloseData;
}

export interface SupervisorShiftState {
  // Shifts the supervisor confirmed with Review as part of the day.
  selectedShiftIds: string[];
  setSelectedShiftIds: (ids: string[]) => void;
}
