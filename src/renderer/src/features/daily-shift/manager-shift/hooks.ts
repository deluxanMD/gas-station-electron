import { useState } from 'react';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCan } from '@/features/auth/hooks';
import { endShift, useOpenShift } from '@/features/shift/hooks';
import type { UseFinishShift } from '@/features/shift/types';
import {
  buildLottoReconciliationRequest,
  saveLottoReconciliation,
} from './manager-shift-step-five/api';
import {
  buildLottoReportRequest,
  saveLottoReport,
} from './manager-shift-step-four/api';
import {
  buildScratchTicketsRequest,
  saveScratchTickets,
} from './manager-shift-step-three/api';
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

function isSaved(current: unknown, previous: unknown): boolean {
  return JSON.stringify(current) === JSON.stringify(previous);
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
    const {
      scratchTickets,
      lottoReports,
      lottoReconciliation,
      saved,
      markSaved,
    } = useManagerShiftStore.getState();
    if (!scratchTickets || !lottoReports || !lottoReconciliation) {
      setError(
        'Complete the scratch tickets, lotto reports and reconciliation before posting.',
      );
      return;
    }
    setClosing(true);
    setError(null);
    const ids = { shiftId: shift.id, userId: dbUserId };
    try {
      if (!isSaved(scratchTickets, saved.scratchTickets)) {
        await saveScratchTickets(
          buildScratchTicketsRequest(dbUserId, scratchTickets),
        );
        markSaved('scratchTickets', scratchTickets);
      }
      if (!isSaved(lottoReports, saved.lottoReports)) {
        await saveLottoReport(buildLottoReportRequest(ids, lottoReports));
        markSaved('lottoReports', lottoReports);
      }
      if (!isSaved(lottoReconciliation, saved.lottoReconciliation)) {
        await saveLottoReconciliation(
          buildLottoReconciliationRequest(ids, lottoReconciliation),
        );
        markSaved('lottoReconciliation', lottoReconciliation);
      }
      await endShift(shift.id);
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
