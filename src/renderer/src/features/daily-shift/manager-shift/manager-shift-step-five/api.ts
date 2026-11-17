import type { LottoReconciliationData } from '@/features/daily-shift/manager-shift/types';
import { LOSS_ATTRIBUTION_API } from './constants';
import type { LottoReconciliationRequest } from './types';

export function buildLottoReconciliationRequest(
  ids: { shiftClientId: string; userId: number },
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
