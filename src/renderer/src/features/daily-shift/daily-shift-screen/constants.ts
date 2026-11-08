import type { ComponentType } from 'react';
import { UserRole } from '@/features/auth/constants';
import { CashierShift } from '@/features/daily-shift/cashier-shift';
import type { CashierShiftProps } from '@/features/daily-shift/cashier-shift/types';

// The shift flow differs per role; roles without an entry have no flow yet.
export const SHIFT_FLOWS: Partial<
  Record<UserRole, ComponentType<CashierShiftProps>>
> = {
  [UserRole.Cashier]: CashierShift,
};
