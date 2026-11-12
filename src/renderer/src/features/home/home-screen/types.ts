import type { ModuleId } from '@/features/auth/types';
import type { CurrentShift, UseStartShift } from '@/features/shift/types';

export interface HomeScreenProps {
  userId: string;
  onSignOut: () => void;
  onSelectModule: (id: ModuleId) => void;
}

export interface UseShiftHeader extends UseStartShift {
  current: CurrentShift;
  retry: () => void;
}

export interface UseModuleSelection {
  // True while the closing confirmation is showing.
  confirmOpen: boolean;
  setConfirmOpen: (open: boolean) => void;
  select: (id: ModuleId) => void;
  confirm: () => void;
  // A locked module cannot be opened yet (Daily Shift needs an open shift).
  isLocked: (id: ModuleId) => boolean;
}
