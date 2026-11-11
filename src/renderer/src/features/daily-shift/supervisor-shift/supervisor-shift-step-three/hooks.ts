import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { parseAmountToCents } from '@/lib/money';
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

export function useFuelDeliveryForm({
  onNext,
}: UseFuelDeliveryFormOptions): UseFuelDeliveryFormReturn {
  const deliveries = useSupervisorShiftStore((s) => s.fuelDeliveries);
  const setDeliveries = useSupervisorShiftStore((s) => s.setFuelDeliveries);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FuelDeliveryValues>({
    resolver: zodResolver(fuelDeliverySchema),
    defaultValues: EMPTY_FUEL_DELIVERY,
  });

  const addDelivery = form.handleSubmit((values) => {
    setError(null);
    setDeliveries([
      ...deliveries,
      {
        id: crypto.randomUUID(),
        date: values.date,
        bolNumber: values.bolNumber,
        regCentiLitres: parseAmountToCents(values.reg),
        premCentiLitres: parseAmountToCents(values.prem),
        dieselCentiLitres: parseAmountToCents(values.diesel),
        totalCentiLitres: parseAmountToCents(values.total),
      },
    ]);
    form.reset(EMPTY_FUEL_DELIVERY);
  });

  const removeDelivery = (id: string): void => {
    setDeliveries(deliveries.filter((delivery) => delivery.id !== id));
  };

  // Next: deliveries are optional, but don't silently drop a started entry.
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!isBlank(form.getValues())) {
      setError('Click Add Fuel Delivery to save this delivery, or clear it.');
      return;
    }
    setError(null);
    onNext();
  };

  return { form, deliveries, addDelivery, removeDelivery, error, handleSubmit };
}
