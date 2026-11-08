import type { ModuleAction, ModuleId } from '@/features/auth/types';

export interface RequirePermissionProps<M extends ModuleId> {
  module: M;
  action: ModuleAction<M>;
}
