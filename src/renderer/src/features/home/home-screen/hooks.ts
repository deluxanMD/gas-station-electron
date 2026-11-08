import { useAuthStore } from '@/features/auth/auth-store';
import { hasPermission } from '@/features/auth/permissions';
import { MODULES } from './constants';

// Only the modules the signed-in role may view.
export function useVisibleModules(): (typeof MODULES)[number][] {
  const role = useAuthStore((s) => s.user?.userRole ?? null);
  return MODULES.filter(({ id }) => hasPermission(role, id, 'view'));
}
