import { apiRequest } from '@/lib/api';
import type { LottoReportsData } from '@/features/daily-shift/manager-shift/types';
import { LOTTO_SLIP_TYPE } from './constants';
import type {
  LatestLottoDayEndResponse,
  LottoDayEndSlip,
  LottoReportRequest,
  LottoSlipRequest,
} from './types';

const orNull = (value: string): string | null => (value === '' ? null : value);

// Four slips: the previous day's figures the Net was taken against, then the
// three typed columns. Amounts are already whole cents.
export function buildLottoReportRequest(
  ids: { shiftId: number; userId: number },
  data: LottoReportsData,
): LottoReportRequest {
  const typed = (
    column: 'yesterday' | 'fullDay' | 'dayEnd',
  ): LottoSlipRequest => ({
    slipType: LOTTO_SLIP_TYPE[column],
    reportDate: orNull(data.dates[column]),
    reportTime: orNull(data.reportTimes[column]),
    amounts: data.columns[column],
  });
  return {
    ...ids,
    slips: [
      {
        slipType: LOTTO_SLIP_TYPE.previousDay,
        reportDate: null,
        reportTime: null,
        amounts: data.previousDay,
      },
      typed('yesterday'),
      typed('fullDay'),
      typed('dayEnd'),
    ],
  };
}

// A 409 (already saved for this shift) is surfaced to the manager: a repeat of
// identical values is skipped before reaching here.
export async function saveLottoReport(
  request: LottoReportRequest,
): Promise<void> {
  await apiRequest(
    'lotto-reports',
    { method: 'POST', body: JSON.stringify(request) },
    'Saving the lotto reports failed.',
  );
}

// The latest saved day-end slip: the next report's previous-day figures.
export async function fetchLatestLottoDayEnd(): Promise<LottoDayEndSlip | null> {
  const body = await apiRequest<LatestLottoDayEndResponse>(
    'lotto-reports/latest',
    undefined,
    'Unable to load the previous day figures.',
  );
  return body.data;
}
