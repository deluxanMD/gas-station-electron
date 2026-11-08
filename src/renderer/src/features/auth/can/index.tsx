import type { JSX } from 'react';
import { useCan } from '@/features/auth/hooks';
import type { ModuleId } from '@/features/auth/types';
import type { CanProps } from './types';

// Renders its children only if the signed-in role is allowed the action.
export function Can<M extends ModuleId>({
  module,
  action,
  children,
}: CanProps<M>): JSX.Element | null {
  return useCan(module, action) ? <>{children}</> : null;
}
