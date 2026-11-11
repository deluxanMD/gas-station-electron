import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import {
  formatCentsAsAmount,
  parseAmountToCents,
  parseSignedAmountToCents,
} from '@/lib/money';
import { DEFAULT_SHIFT_NUMBER, EMPTY_DAILY_SUMMARY } from './constants';
import { dailySummarySchema } from './schema';
import type {
  DailySummaryValues,
  UseDailySummaryFormOptions,
  UseDailySummaryFormReturn,
} from './types';

export function useDailySummaryForm({
  onNext,
}: UseDailySummaryFormOptions): UseDailySummaryFormReturn {
  const saved = useCashierShiftStore((s) => s.dailySummary);
  const setDailySummary = useCashierShiftStore((s) => s.setDailySummary);

  const defaultValues: DailySummaryValues = saved
    ? {
        dayEndDate: saved.dayEndDate,
        dayEndTime: saved.dayEndTime,
        shiftNumber: String(saved.shiftNumber),
        shiftChangeReason: saved.shiftChangeReason,
        fuelSales: formatCentsAsAmount(saved.fuelSalesCents),
        itemSales: formatCentsAsAmount(saved.itemSalesCents),
        gst: formatCentsAsAmount(saved.gstCents),
        hst: formatCentsAsAmount(saved.hstCents),
        pennyRounding: formatCentsAsAmount(saved.pennyRoundingCents),
        totalSales: formatCentsAsAmount(saved.totalSalesCents),
      }
    : EMPTY_DAILY_SUMMARY;

  const form = useForm<DailySummaryValues>({
    resolver: zodResolver(dailySummarySchema),
    defaultValues,
  });

  const shiftNumber = useWatch({ control: form.control, name: 'shiftNumber' });
  const needsChangeReason = shiftNumber.trim() !== String(DEFAULT_SHIFT_NUMBER);

  const handleSubmit = form.handleSubmit((values) => {
    const shiftNumber = Number(values.shiftNumber);
    setDailySummary({
      dayEndDate: values.dayEndDate,
      dayEndTime: values.dayEndTime,
      shiftNumber,
      shiftChangeReason:
        shiftNumber === DEFAULT_SHIFT_NUMBER ? '' : values.shiftChangeReason,
      fuelSalesCents: parseAmountToCents(values.fuelSales),
      itemSalesCents: parseAmountToCents(values.itemSales),
      gstCents: parseAmountToCents(values.gst),
      hstCents: parseAmountToCents(values.hst),
      pennyRoundingCents: parseSignedAmountToCents(values.pennyRounding),
      totalSalesCents: parseAmountToCents(values.totalSales),
    });
    onNext();
  });

  return { form, handleSubmit, needsChangeReason };
}
