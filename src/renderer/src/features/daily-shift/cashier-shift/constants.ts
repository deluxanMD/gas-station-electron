import { CashierStepThree } from '@/features/daily-shift/cashier-shift/cashier-shift-step-three';
import { CashierStepTwo } from '@/features/daily-shift/cashier-shift/cashier-shift-step-two';
import { CreditTotals } from '@/features/daily-shift/cashier-shift/cashier-shift-step-one';
import type { ShiftStep } from './types';

// Titles for steps 2 and 3 are placeholders until the screens are designed.
export const CASHIER_STEPS: readonly ShiftStep[] = [
  {
    id: 'credit-totals',
    title: 'Credit Totals',
    formId: 'credit-totals-form',
    component: CreditTotals,
  },
  { id: 'step-two', title: 'Step 2', component: CashierStepTwo },
  { id: 'step-three', title: 'Step 3', component: CashierStepThree },
];
