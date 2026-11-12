import type { JSX } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useShiftStore } from '@/features/shift/shift-store';
import { ROUTES } from './constants';

export function DailyShiftRoute(): JSX.Element | null {
  const navigate = useNavigate();
  const status = useShiftStore((s) => s.current.status);

  // Waiting for the API to say whether a shift is open.
  if (status === 'loading') return null;
  // Closing a shift needs an open one (also covers a page reload mid-way).
  return status === 'open' ? (
    <DailyShiftScreen onExit={() => void navigate(ROUTES.home)} />
  ) : (
    <Navigate to={ROUTES.home} replace />
  );
}
