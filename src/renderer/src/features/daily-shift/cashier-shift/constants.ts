import { CashierStepOne } from '@/features/daily-shift/cashier-step-one';
import { CashierStepThree } from '@/features/daily-shift/cashier-step-three';
import { CashierStepTwo } from '@/features/daily-shift/cashier-step-two';
import type { ShiftStep } from './types';

// Titles are placeholders until the screens are designed.
export const CASHIER_STEPS: readonly ShiftStep[] = [
  { id: 'step-one', title: 'Step 1', component: CashierStepOne },
  { id: 'step-two', title: 'Step 2', component: CashierStepTwo },
  { id: 'step-three', title: 'Step 3', component: CashierStepThree },
];
