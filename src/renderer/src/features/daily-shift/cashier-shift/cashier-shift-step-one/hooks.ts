import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import { formatCentsAsAmount, parseAmountToCents } from '@/lib/money';
import { EMPTY_CREDIT_TOTALS } from './constants';
import { creditTotalsSchema } from './schema';
import type {
  CreditTotalsValues,
  UseCreditTotalsFormOptions,
  UseCreditTotalsFormReturn,
} from './types';

export function useCreditTotalsForm({
  onNext,
}: UseCreditTotalsFormOptions): UseCreditTotalsFormReturn {
  const saved = useCashierShiftStore((s) => s.creditTotals);
  const setCreditTotals = useCashierShiftStore((s) => s.setCreditTotals);

  const defaultValues: CreditTotalsValues = saved
    ? {
        creditTerminal: formatCentsAsAmount(saved.creditTerminalCents),
        creditHost: formatCentsAsAmount(saved.creditHostCents),
        debitTerminal: formatCentsAsAmount(saved.debitTerminalCents),
        fleet: formatCentsAsAmount(saved.fleetCents),
        svRedemption: formatCentsAsAmount(saved.svRedemptionCents),
      }
    : EMPTY_CREDIT_TOTALS;

  const form = useForm<CreditTotalsValues>({
    resolver: zodResolver(creditTotalsSchema),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit((values) => {
    setCreditTotals({
      creditTerminalCents: parseAmountToCents(values.creditTerminal),
      creditHostCents: parseAmountToCents(values.creditHost),
      debitTerminalCents: parseAmountToCents(values.debitTerminal),
      fleetCents: parseAmountToCents(values.fleet),
      svRedemptionCents: parseAmountToCents(values.svRedemption),
    });
    onNext();
  });

  return { form, handleSubmit };
}
