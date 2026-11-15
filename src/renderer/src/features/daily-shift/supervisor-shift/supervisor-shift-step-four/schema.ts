import { z } from 'zod';
import { isValidAmount } from '@/lib/money';

// Volumes use two-decimal fixed point, like money amounts.
const volume = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine(isValidAmount, 'Enter a number like 1250.50');

export const fuelDipsSchema = z.object({
  date: z.string().min(1, 'Required'),
  time: z.string().min(1, 'Required'),
  products: z.array(z.object({ tcVolume: volume, ullage90: volume })),
});
