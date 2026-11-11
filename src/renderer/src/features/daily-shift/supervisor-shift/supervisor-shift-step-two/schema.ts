import { z } from 'zod';
import { isValidAmount, parseAmountToCents } from '@/lib/money';

// Volumes and sales both use two-decimal fixed point, like money amounts.
const decimal = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine(isValidAmount, 'Enter a number like 1250.50');

export const fuelSchema = z
  .object({
    grades: z.array(z.object({ volume: decimal, total: decimal })),
    totalVolume: decimal,
  })
  .superRefine((values, ctx) => {
    const volumes = values.grades.map((grade) => grade.volume.trim());
    if (!volumes.every(isValidAmount) || !isValidAmount(values.totalVolume)) {
      return;
    }
    const sum = volumes.reduce((s, v) => s + parseAmountToCents(v), 0);
    if (sum !== parseAmountToCents(values.totalVolume.trim())) {
      ctx.addIssue({
        code: 'custom',
        path: ['totalVolume'],
        message:
          'Total Volume does not equal the sum of the grade volumes. Please recheck.',
      });
    }
  });
