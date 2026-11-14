import { UserRole } from '@/features/auth/constants';
import type {
  AccessTable,
  ModuleAction,
  ModuleId,
} from '@/features/auth/types';

export const ACCESS = {
  'cash-management': {
    view: [
      UserRole.Owner,
      UserRole.Manager,
      UserRole.Supervisor,
      UserRole.Cashier,
      UserRole.Accounting,
    ],
  },
  'daily-shift': {
    view: [
      UserRole.Owner,
      UserRole.Manager,
      UserRole.Supervisor,
      UserRole.Cashier,
    ],
    // Cashiers and supervisors work inside a tracked shift (start, close, closing modal).
    trackShift: [UserRole.Supervisor, UserRole.Cashier],
  },
  'wetstock-management': {
    view: [UserRole.Owner, UserRole.Manager, UserRole.Supervisor],
  },
  'fuel-pricing': {
    view: [UserRole.Owner, UserRole.Manager],
  },
  dispatch: {
    view: [UserRole.Owner, UserRole.Manager, UserRole.Dispatch],
  },
  'fuel-p-and-l': {
    view: [UserRole.Owner, UserRole.Manager, UserRole.Accounting],
  },
} as const satisfies AccessTable;

// Deny by default: no role, or an action nobody was granted, means no access.
export function hasPermission<M extends ModuleId>(
  role: UserRole | null,
  module: M,
  action: ModuleAction<M>,
): boolean {
  if (!role) return false;
  const actions: Record<string, readonly UserRole[]> = ACCESS[module];
  return actions[action as string]?.includes(role) ?? false;
}
