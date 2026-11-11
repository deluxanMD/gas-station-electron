import { CashierStepThree } from '@/features/daily-shift/cashier-shift/cashier-shift-step-three';
import { DailySummary } from '@/features/daily-shift/cashier-shift/cashier-shift-step-two';
import { CreditTotals } from '@/features/daily-shift/cashier-shift/cashier-shift-step-one';
import type { ShiftStep } from './types';

// The title for step 3 is a placeholder until the screen is designed.
export const CASHIER_STEPS: readonly ShiftStep[] = [
  {
    id: 'credit-totals',
    title: 'Credit Totals',
    formId: 'credit-totals-form',
    component: CreditTotals,
  },
  {
    id: 'daily-summary',
    title: 'Daily Summary Report',
    formId: 'daily-summary-form',
    component: DailySummary,
  },
  { id: 'step-three', title: 'Step 3', component: CashierStepThree },
];
