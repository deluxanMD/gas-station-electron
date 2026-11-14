import type { JSX } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useCan } from '@/features/auth/hooks';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useShiftStore } from '@/features/shift/shift-store';
import { ROUTES } from './constants';

export function DailyShiftRoute(): JSX.Element | null {
  const navigate = useNavigate();
  const status = useShiftStore((s) => s.current.status);
  const tracksShift = useCan('daily-shift', 'trackShift');

  // Roles that don't track shifts need none to open the flow.
  if (!tracksShift) {
    return <DailyShiftScreen onExit={() => void navigate(ROUTES.home)} />;
  }
  // Waiting for the API to say whether a shift is open.
  if (status === 'loading') return null;
  // Closing a shift needs an open one (also covers a page reload mid-way).
  return status === 'open' ? (
    <DailyShiftScreen onExit={() => void navigate(ROUTES.home)} />
  ) : (
    <Navigate to={ROUTES.home} replace />
  );
}
