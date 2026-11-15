import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/features/auth/auth-store';
import { useLoadCurrentShift } from '@/features/shift/hooks';
import { ROUTES } from '@/router/constants';

// Layout route: signed-out users are sent to the login screen.
export function RequireAuth(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  useLoadCurrentShift();
  return user ? <Outlet /> : <Navigate to={ROUTES.login} replace />;
}
