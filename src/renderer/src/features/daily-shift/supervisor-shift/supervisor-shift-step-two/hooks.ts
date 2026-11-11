import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { formatCentsAsAmount, parseAmountToCents } from '@/lib/money';
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

  const handleSubmit = form.handleSubmit((values) => {
    setFuel({
      grades: values.grades.map((grade, index) => ({
        grade: FUEL_GRADES[index],
        volumeCentiLitres: parseAmountToCents(grade.volume),
        totalCents: parseAmountToCents(grade.total),
      })),
      totalVolumeCentiLitres: parseAmountToCents(values.totalVolume),
    });
    onNext();
  });

  return { form, handleSubmit };
}
