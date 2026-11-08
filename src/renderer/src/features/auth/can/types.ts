import type { ReactNode } from 'react';
import type { ModuleAction, ModuleId } from '@/features/auth/types';

export interface CanProps<M extends ModuleId> {
  module: M;
  action: ModuleAction<M>;
  children: ReactNode;
}
