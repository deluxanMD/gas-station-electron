import { z } from 'zod';
import { isValidAmount } from '@/lib/money';

const amount = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine(isValidAmount, 'Enter an amount like 125.50');

export const creditTotalsSchema = z.object({
  creditTerminal: amount,
  creditHost: amount,
  debitTerminal: amount,
  fleet: amount,
  svRedemption: amount,
});
