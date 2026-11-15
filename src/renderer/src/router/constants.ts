import type { ModuleId } from '@/features/auth/types';

export const ROUTES = {
  home: '/',
  login: '/login',
  dailyShift: '/daily-shift',
} as const;

// Modules without a path are not built yet, so their cards stay inert.
export const MODULE_PATHS: Partial<Record<ModuleId, string>> = {
  'daily-shift': ROUTES.dailyShift,
};
