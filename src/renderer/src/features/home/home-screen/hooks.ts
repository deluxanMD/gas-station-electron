import { useState } from 'react';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCan } from '@/features/auth/hooks';
import { hasPermission } from '@/features/auth/permissions';
import type { ModuleId } from '@/features/auth/types';
import { loadCurrentShift, useStartShift } from '@/features/shift/hooks';
import { useShiftStore } from '@/features/shift/shift-store';
import { DAILY_SHIFT_MODULE_ID, MODULES } from './constants';
import type { UseModuleSelection, UseShiftHeader } from './types';

// Only the modules the signed-in role may view.
export function useVisibleModules(): (typeof MODULES)[number][] {
  const role = useAuthStore((s) => s.user?.userRole ?? null);
  return MODULES.filter(({ id }) => hasPermission(role, id, 'view'));
}

export function useShiftHeader(): UseShiftHeader {
  const current = useShiftStore((s) => s.current);
  const dbUserId = useAuthStore((s) => s.dbUserId);
  const startShift = useStartShift();

  const retry = (): void => {
    if (dbUserId !== null) void loadCurrentShift(dbUserId);
  };

  return { ...startShift, current, retry };
}

// For shift-tracked roles Daily Shift ends the shift, so it needs an open one
// and asks before opening. Other roles open it directly.
export function useModuleSelection(
  onSelectModule: (id: ModuleId) => void,
): UseModuleSelection {
  const hasOpenShift = useShiftStore((s) => s.current.status === 'open');
  const tracksShift = useCan('daily-shift', 'trackShift');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isLocked = (id: ModuleId): boolean =>
    tracksShift && id === DAILY_SHIFT_MODULE_ID && !hasOpenShift;

  const select = (id: ModuleId): void => {
    if (isLocked(id)) return;
    if (tracksShift && id === DAILY_SHIFT_MODULE_ID) setConfirmOpen(true);
    else onSelectModule(id);
  };

  const confirm = (): void => {
    setConfirmOpen(false);
    onSelectModule(DAILY_SHIFT_MODULE_ID);
  };

  return { confirmOpen, setConfirmOpen, select, confirm, isLocked };
}
