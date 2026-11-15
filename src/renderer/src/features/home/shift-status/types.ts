import type { CurrentShift } from '@/features/shift/types';

export interface ShiftStatusProps {
  current: CurrentShift;
  onStart: () => void;
  starting: boolean;
  // Why the last start attempt failed, if it did.
  startError: string | null;
  onRetry: () => void;
}
