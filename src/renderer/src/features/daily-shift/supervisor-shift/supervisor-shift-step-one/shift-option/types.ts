import type { ShiftWithUser } from '@/features/shift/types';

export interface ShiftOptionProps {
  shift: ShiftWithUser;
  checked: boolean;
  onToggle: (id: string) => void;
}
