import { zodResolver } from '@hookform/resolvers/zod';
import type { FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import type { FuelDeliveryEntry } from '@/features/daily-shift/supervisor-shift/types';
import { formatCentsAsAmount, parseAmountToCents } from '@/lib/money';
import { EMPTY_FUEL_DELIVERY } from './constants';
import { fuelDeliverySchema } from './schema';
import type {
  FuelDeliveryValues,
  UseFuelDeliveryFormOptions,
  UseFuelDeliveryFormReturn,
} from './types';

function isBlank(values: FuelDeliveryValues): boolean {
  return Object.values(values).every((value) => value.trim() === '');
}

function toValues(saved: FuelDeliveryEntry | null): FuelDeliveryValues {
  if (!saved) return EMPTY_FUEL_DELIVERY;
  return {
    date: saved.date,
    bolNumber: saved.bolNumber,
    reg: formatCentsAsAmount(saved.regCentiLitres),
    prem: formatCentsAsAmount(saved.premCentiLitres),
    diesel: formatCentsAsAmount(saved.dieselCentiLitres),
    total: formatCentsAsAmount(saved.totalCentiLitres),
  };
}

export function useFuelDeliveryForm({
  onNext,
}: UseFuelDeliveryFormOptions): UseFuelDeliveryFormReturn {
  const saved = useSupervisorShiftStore((s) => s.fuelDelivery);
  const setFuelDelivery = useSupervisorShiftStore((s) => s.setFuelDelivery);

  const form = useForm<FuelDeliveryValues>({
    resolver: zodResolver(fuelDeliverySchema),
    defaultValues: toValues(saved),
  });

  // Saved to the API with the rest of the shift on the last step.
  const keep = form.handleSubmit((values) => {
    setFuelDelivery({
      date: values.date,
      bolNumber: values.bolNumber.trim(),
      regCentiLitres: parseAmountToCents(values.reg),
      premCentiLitres: parseAmountToCents(values.prem),
      dieselCentiLitres: parseAmountToCents(values.diesel),
      totalCentiLitres: parseAmountToCents(values.total),
    });
    onNext();
  });

  // A delivery is optional, so an empty form just moves on.
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (isBlank(form.getValues())) {
      setFuelDelivery(null);
      onNext();
      return;
    }
    void keep();
  };

  return { form, handleSubmit };
}
