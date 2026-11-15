import { z } from 'zod';
import { isValidAmount, parseAmountToCents } from '@/lib/money';

// Volumes use two-decimal fixed point, like money amounts.
const volume = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine(isValidAmount, 'Enter a number like 1250.50');

export const fuelDeliverySchema = z
  .object({
    date: z.string().min(1, 'Required'),
    bolNumber: z.string().trim().min(1, 'Required'),
    reg: volume,
    prem: volume,
    diesel: volume,
    total: volume,
  })
  .superRefine((values, ctx) => {
    const parts = [values.reg, values.prem, values.diesel].map((v) => v.trim());
    if (!parts.every(isValidAmount) || !isValidAmount(values.total.trim())) {
      return;
    }
    const sum = parts.reduce((s, v) => s + parseAmountToCents(v), 0);
    if (sum !== parseAmountToCents(values.total.trim())) {
      ctx.addIssue({
        code: 'custom',
        path: ['total'],
        message: 'Total does not equal REG + PREM + DIESEL. Please recheck.',
      });
    }
  });
