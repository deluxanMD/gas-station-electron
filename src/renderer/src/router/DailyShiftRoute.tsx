import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { ROUTES } from './constants';

export function DailyShiftRoute(): JSX.Element {
  const navigate = useNavigate();
  return <DailyShiftScreen onExit={() => void navigate(ROUTES.home)} />;
}
