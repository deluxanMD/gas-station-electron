import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import {
  formatCentsAsAmount,
  parseAmountToCents,
  parseSignedAmountToCents,
} from '@/lib/money';
import { useAuthStore } from '@/features/auth/auth-store';
import { EMPTY_DAILY_SUMMARY } from './constants';
import { createDailySummarySchema } from './schema';
import type {
  DailySummaryValues,
  UseDailySummaryFormOptions,
  UseDailySummaryFormReturn,
} from './types';

export function useDailySummaryForm({
  onNext,
}: UseDailySummaryFormOptions): UseDailySummaryFormReturn {
  const shiftId = useAuthStore((s) => s.shiftId);
  const defaultShiftNumber = shiftId === null ? '' : String(shiftId);
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
    : { ...EMPTY_DAILY_SUMMARY, shiftNumber: defaultShiftNumber };

  const form = useForm<DailySummaryValues>({
    resolver: zodResolver(createDailySummarySchema(defaultShiftNumber)),
    defaultValues,
  });

  const shiftNumber = useWatch({ control: form.control, name: 'shiftNumber' });
  const needsChangeReason = shiftNumber.trim() !== defaultShiftNumber;

  const handleSubmit = form.handleSubmit((values) => {
    const shiftNumber = Number(values.shiftNumber);
    setDailySummary({
      dayEndDate: values.dayEndDate,
      dayEndTime: values.dayEndTime,
      shiftNumber,
      shiftChangeReason:
        String(shiftNumber) === defaultShiftNumber
          ? ''
          : values.shiftChangeReason,
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
