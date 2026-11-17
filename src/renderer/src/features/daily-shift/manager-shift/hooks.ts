import { useState } from 'react';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCan } from '@/features/auth/hooks';
import { useOpenShift } from '@/features/shift/hooks';
import { finishShift } from '@/features/shift/local';
import { localDateString } from '@/lib/date';
import type { UseFinishShift } from '@/features/shift/types';
import { buildLottoReconciliationRequest } from './manager-shift-step-five/api';
import { buildLottoReportRequest } from './manager-shift-step-four/api';
import { buildScratchTicketsRequest } from './manager-shift-step-three/api';
import { useManagerShiftStore } from './manager-shift-store';
import type { UseStepper } from './types';

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

export function useFinishManagerShift(onExit: () => void): UseFinishShift {
  const shift = useOpenShift();
  const dbUserId = useAuthStore((s) => s.dbUserId);
  const tracksShift = useCan('daily-shift', 'trackShift');
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (): Promise<void> => {
    if (closing) return;
    // Roles that don't track shifts have nothing to save or close.
    if (!tracksShift) {
      onExit();
      return;
    }
    if (!shift || dbUserId === null) {
      setError('There is no open shift to close.');
      return;
    }
    const { scratchTickets, lottoReports, lottoReconciliation } =
      useManagerShiftStore.getState();
    if (!scratchTickets || !lottoReports || !lottoReconciliation) {
      setError(
        'Complete the scratch tickets, lotto reports and reconciliation before posting.',
      );
      return;
    }
    setClosing(true);
    setError(null);
    const ids = { shiftClientId: shift.clientId, userId: dbUserId };
    try {
      // All three reports and the close are saved on this device together; the sync engine sends them to the server
      // when it can be reached.
      await finishShift(shift, [
        {
          entity: 'scratch-tickets',
          path: 'scratch-tickets',
          payload: {
            ...buildScratchTicketsRequest(
              dbUserId,
              scratchTickets,
              localDateString(new Date()),
            ),
          },
        },
        {
          entity: 'lotto-report',
          path: 'lotto-reports',
          payload: { ...buildLottoReportRequest(ids, lottoReports) },
        },
        {
          entity: 'lotto-reconciliation',
          path: 'lotto-reconciliations',
          payload: {
            ...buildLottoReconciliationRequest(ids, lottoReconciliation),
          },
        },
      ]);
      useManagerShiftStore.getState().reset();
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : 'Unable to post the shift.',
      );
      setClosing(false);
      return;
    }
    onExit();
  };

  return { finish: () => void finish(), closing, error };
}
