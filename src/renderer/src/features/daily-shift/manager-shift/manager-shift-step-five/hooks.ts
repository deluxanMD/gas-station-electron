import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import {
  formatCentsAsAmount,
  isValidAmount,
  isValidSignedAmount,
  parseAmountToCents,
  parseSignedAmountToCents,
} from '@/lib/money';
import { EMPTY_LOTTO_RECONCILIATION } from './constants';
import { lottoReconciliationSchema } from './schema';
import type {
  LottoReconciliationFigures,
  LottoReconciliationValues,
  UseLottoReconciliationFormOptions,
  UseLottoReconciliationFormReturn,
} from './types';

function toCents(value: string): number {
  const trimmed = value.trim();
  return isValidAmount(trimmed) ? parseAmountToCents(trimmed) : 0;
}

function toSignedCents(value: string): number {
  const trimmed = value.trim();
  return isValidSignedAmount(trimmed) ? parseSignedAmountToCents(trimmed) : 0;
}

export function useLottoReconciliationForm({
  onNext,
}: UseLottoReconciliationFormOptions): UseLottoReconciliationFormReturn {
  const scratchTickets = useManagerShiftStore((s) => s.scratchTickets);
  const lottoReports = useManagerShiftStore((s) => s.lottoReports);
  const saved = useManagerShiftStore((s) => s.lottoReconciliation);
  const setLottoReconciliation = useManagerShiftStore(
    (s) => s.setLottoReconciliation,
  );
  // The Bull-* figures start from what the cashier recorded; the manager can
  // correct them. Until shifts are stored this is the just-closed shift.
  const cashClose = useCashierShiftStore((s) => s.cashClose);

  const defaultValues: LottoReconciliationValues = saved
    ? {
        bullock: formatCentsAsAmount(saved.bullockCents),
        bullPayouts: formatCentsAsAmount(saved.bullPayoutsCents),
        bullLottoWinner: formatCentsAsAmount(saved.bullLottoWinnerCents),
        cashNet: formatCentsAsAmount(saved.cashNetCents),
        attribution: saved.attribution,
      }
    : {
        ...EMPTY_LOTTO_RECONCILIATION,
        bullPayouts: formatCentsAsAmount(
          cashClose?.payouts
            .filter((payout) => payout.type === 'lotto-payout')
            .reduce((sum, payout) => sum + payout.amountCents, 0) ?? 0,
        ),
        bullLottoWinner: formatCentsAsAmount(cashClose?.lottoWinnerCents ?? 0),
      };

  const form = useForm<LottoReconciliationValues>({
    resolver: zodResolver(lottoReconciliationSchema),
    defaultValues,
  });

  const [bullock, bullPayouts, bullLottoWinner, cashNet, attribution] =
    useWatch({
      control: form.control,
      name: [
        'bullock',
        'bullPayouts',
        'bullLottoWinner',
        'cashNet',
        'attribution',
      ],
    });

  // Sold at the terminals: instant tickets plus on-line net.
  const instant = scratchTickets?.totalAmountCents ?? 0;
  const online = lottoReports?.netOnlineCents ?? 0;
  const total = instant + online;
  const lottoNet = total - toCents(bullock);

  // Payouts OLG reports, less what the store paid out per its own records.
  const olgPayout = lottoReports?.cashRedemCents ?? 0;
  const redemNet = olgPayout - toCents(bullPayouts) - toCents(bullLottoWinner);
  const net = lottoNet + redemNet;

  // Activations OLG reports, against the value activated per the shift sheet.
  const activationsOlg = lottoReports?.activationsCents ?? 0;
  const activationsShift =
    scratchTickets?.rows.reduce(
      (sum, row) => sum + row.activationsCount * row.denomination * 100,
      0,
    ) ?? 0;
  const activationsNet = activationsOlg - activationsShift;

  const figures: LottoReconciliationFigures = {
    values: {
      instant,
      online,
      total,
      olgPayout,
      lottoNet,
      redemNet,
      net,
      activationsOlg,
      activationsShift,
      bottomNet: net + activationsNet,
    },
    activationsNet,
    summaryTotal: net + activationsNet + toSignedCents(cashNet),
  };

  const handleSubmit = form.handleSubmit((values) => {
    setLottoReconciliation({
      bullockCents: parseAmountToCents(values.bullock),
      bullPayoutsCents: parseAmountToCents(values.bullPayouts),
      bullLottoWinnerCents: parseAmountToCents(values.bullLottoWinner),
      cashNetCents: parseSignedAmountToCents(values.cashNet),
      attribution: values.attribution,
      totalCents: figures.summaryTotal,
    });
    onNext();
  });

  return {
    form,
    handleSubmit,
    figures,
    needsAttribution: figures.summaryTotal !== 0 && attribution === '',
  };
}
