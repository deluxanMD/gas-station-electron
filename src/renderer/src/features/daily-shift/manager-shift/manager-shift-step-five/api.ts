import { apiRequest } from '@/lib/api';
import type { LottoReconciliationData } from '@/features/daily-shift/manager-shift/types';
import { LOSS_ATTRIBUTION_API } from './constants';
import type { LottoReconciliationRequest } from './types';

export function buildLottoReconciliationRequest(
  ids: { shiftId: number; userId: number },
  data: LottoReconciliationData,
): LottoReconciliationRequest {
  return {
    ...ids,
    bullock: data.bullockCents,
    bullPayouts: data.bullPayoutsCents,
    bullLottoWinner: data.bullLottoWinnerCents,
    lottoNet: data.lottoNetCents,
    redeemNet: data.redeemNetCents,
    activationsNet: data.activationsNetCents,
    cashNet: data.cashNetCents,
    total: data.totalCents,
    attribution:
      data.attribution === '' ? null : LOSS_ATTRIBUTION_API[data.attribution],
  };
}

// A 409 (already saved for this shift) is surfaced to the manager: a retry of
// identical values is skipped before reaching here.
export async function saveLottoReconciliation(
  request: LottoReconciliationRequest,
): Promise<void> {
  await apiRequest(
    'lotto-reconciliations',
    { method: 'POST', body: JSON.stringify(request) },
    'Saving the reconciliation failed.',
  );
}
