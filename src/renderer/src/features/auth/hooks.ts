import { useAuthStore } from '@/features/auth/auth-store';
import { hasPermission } from '@/features/auth/permissions';
import type { ModuleAction, ModuleId } from '@/features/auth/types';

export function useCan<M extends ModuleId>(
  module: M,
  action: ModuleAction<M>,
): boolean {
  const role = useAuthStore((s) => s.user?.userRole ?? null);
  return hasPermission(role, module, action);
}
