import { useState } from 'react';
import { useCan } from '@/features/auth/hooks';
import { useOpenShift } from '@/features/shift/hooks';
import { finishShift } from '@/features/shift/local';
import { useSupervisorShiftStore } from './supervisor-shift-store';
import { buildSupervisorWrites } from './api';
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

// The last step: saves what the steps collected and closes the shift, on this
// device; the sync engine sends it to the server when it can be reached.
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
    const { fuel, fuelDelivery, fuelDips } = useSupervisorShiftStore.getState();
    if (!fuel || !fuelDips) {
      setError('Enter the fuel volumes and the fuel dips before finishing.');
      return;
    }
    setClosing(true);
    setError(null);
    try {
      await finishShift(
        shift,
        buildSupervisorWrites(
          { shiftClientId: shift.clientId, userId: shift.userId },
          { fuel, fuelDelivery, fuelDips },
        ),
      );
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
