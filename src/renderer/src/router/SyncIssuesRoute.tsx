import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { SyncIssuesScreen } from '@/features/sync/issues-screen';
import { ROUTES } from './constants';

export function SyncIssuesRoute(): JSX.Element {
  const navigate = useNavigate();
  return <SyncIssuesScreen onExit={() => void navigate(ROUTES.home)} />;
}
