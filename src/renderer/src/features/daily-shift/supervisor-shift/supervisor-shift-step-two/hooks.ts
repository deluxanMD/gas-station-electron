import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { useOpenShift } from '@/features/shift/hooks';
import { formatCentsAsAmount, parseAmountToCents } from '@/lib/money';
import { buildFuelRequest, saveFuel } from './api';
import { EMPTY_FUEL, FUEL_GRADES } from './constants';
import { fuelSchema } from './schema';
import type {
  FuelValues,
  UseFuelEntryFormOptions,
  UseFuelEntryFormReturn,
} from './types';

export function useFuelEntryForm({
  onNext,
}: UseFuelEntryFormOptions): UseFuelEntryFormReturn {
  const shift = useOpenShift();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const saved = useSupervisorShiftStore((s) => s.fuel);
  const setFuel = useSupervisorShiftStore((s) => s.setFuel);

  const defaultValues: FuelValues = saved
    ? {
        grades: saved.grades.map((grade) => ({
          volume: formatCentsAsAmount(grade.volumeCentiLitres),
          total: formatCentsAsAmount(grade.totalCents),
        })),
        totalVolume: formatCentsAsAmount(saved.totalVolumeCentiLitres),
      }
    : EMPTY_FUEL;

  const form = useForm<FuelValues>({
    resolver: zodResolver(fuelSchema),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    const fuel = {
      grades: values.grades.map((grade, index) => ({
        grade: FUEL_GRADES[index],
        volumeCentiLitres: parseAmountToCents(grade.volume),
        totalCents: parseAmountToCents(grade.total),
      })),
      totalVolumeCentiLitres: parseAmountToCents(values.totalVolume),
    };
    if (!shift) {
      setSubmitError('There is no open shift to save the fuel entries to.');
      return;
    }
    setSubmitError(null);
    try {
      await saveFuel(
        buildFuelRequest({ shiftId: shift.id, userId: shift.userId }, fuel),
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Saving the fuel entries failed.',
      );
      return;
    }
    setFuel(fuel);
    onNext();
  });

  return { form, handleSubmit, submitError };
}
