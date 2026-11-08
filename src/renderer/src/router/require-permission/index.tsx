import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useCan } from '@/features/auth/hooks';
import type { ModuleId } from '@/features/auth/types';
import { ROUTES } from '@/router/constants';
import type { RequirePermissionProps } from './types';

// Layout route: the UI-side mirror of the API's role check.
export function RequirePermission<M extends ModuleId>({
  module,
  action,
}: RequirePermissionProps<M>): JSX.Element {
  return useCan(module, action) ? (
    <Outlet />
  ) : (
    <Navigate to={ROUTES.home} replace />
  );
}
