import type { ReviewShift } from '@/features/shift/types';

export interface ShiftOptionProps {
  shift: ReviewShift;
  checked: boolean;
  onToggle: (id: string) => void;
}
