import { createElement, type ReactElement } from 'react';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCan } from '@/features/auth/hooks';
import { SHIFT_FLOWS } from './constants';

// The flow for the signed-in role, or null if not allowed / not built yet.
export function useShiftFlow(onExit: () => void): ReactElement | null {
  const role = useAuthStore((s) => s.user?.userRole ?? null);
  const canView = useCan('daily-shift', 'view');
  const flow = canView && role ? SHIFT_FLOWS[role] : undefined;
  return flow ? createElement(flow, { onExit }) : null;
}
