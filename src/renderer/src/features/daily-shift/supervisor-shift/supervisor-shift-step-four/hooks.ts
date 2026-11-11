import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { formatCentsAsAmount, parseAmountToCents } from '@/lib/money';
import { DIP_PRODUCTS, EMPTY_FUEL_DIPS } from './constants';
import { fuelDipsSchema } from './schema';
import type {
  FuelDipsValues,
  UseFuelDipsFormOptions,
  UseFuelDipsFormReturn,
} from './types';

export function useFuelDipsForm({
  onNext,
}: UseFuelDipsFormOptions): UseFuelDipsFormReturn {
  const saved = useSupervisorShiftStore((s) => s.fuelDips);
  const setFuelDips = useSupervisorShiftStore((s) => s.setFuelDips);

  const defaultValues: FuelDipsValues = saved
    ? {
        date: saved.date,
        time: saved.time,
        products: saved.products.map((product) => ({
          tcVolume: formatCentsAsAmount(product.tcVolumeCentiLitres),
          ullage90: formatCentsAsAmount(product.ullage90CentiLitres),
        })),
      }
    : EMPTY_FUEL_DIPS;

  const form = useForm<FuelDipsValues>({
    resolver: zodResolver(fuelDipsSchema),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit((values) => {
    setFuelDips({
      date: values.date,
      time: values.time,
      products: values.products.map((product, index) => ({
        product: DIP_PRODUCTS[index],
        tcVolumeCentiLitres: parseAmountToCents(product.tcVolume),
        ullage90CentiLitres: parseAmountToCents(product.ullage90),
      })),
    });
    onNext();
  });

  return { form, handleSubmit };
}
