import { useState } from 'react';
import { useCan } from '@/features/auth/hooks';
import { endShift, useOpenShift } from '@/features/shift/hooks';
import { useSupervisorShiftStore } from './supervisor-shift-store';
import { saveSupervisorShift } from './api';
import type { UseFinishSupervisorShift, UseStepper } from './types';

export function useStepper(stepCount: number): UseStepper {
  const [stepIndex, setStepIndex] = useState(0);

  return {
    stepIndex,
    isFirst: stepIndex === 0,
    isLast: stepIndex === stepCount - 1,
    next: () => setStepIndex((i) => Math.min(i + 1, stepCount - 1)),
    back: () => setStepIndex((i) => Math.max(i - 1, 0)),
  };
}

// The last step: saves what the steps collected, then closes the shift.
// Every save treats "already saved" as success, so a retry after a failure
// never duplicates rows.
export function useFinishSupervisorShift(
  onExit: () => void,
): UseFinishSupervisorShift {
  const shift = useOpenShift();
  const tracksShift = useCan('daily-shift', 'trackShift');
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (): Promise<void> => {
    if (closing) return;
    if (!tracksShift) {
      onExit();
      return;
    }
    if (!shift) {
      setError('There is no open shift to close.');
      return;
    }
    const { fuel, fuelDelivery } = useSupervisorShiftStore.getState();
    if (!fuel) {
      setError('Enter the fuel volumes and totals before finishing.');
      return;
    }
    setClosing(true);
    setError(null);
    try {
      await saveSupervisorShift(
        { shiftId: shift.id, userId: shift.userId },
        { fuel, fuelDelivery },
      );
      await endShift(shift.id);
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : 'Unable to save the shift.',
      );
      setClosing(false);
      return;
    }
    onExit();
  };

  return { finish: () => void finish(), closing, error };
}
