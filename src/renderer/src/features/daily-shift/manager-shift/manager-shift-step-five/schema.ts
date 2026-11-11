import { z } from 'zod';
import { isValidAmount, isValidSignedAmount } from '@/lib/money';

const amount = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine(isValidAmount, 'Enter an amount like 125.50');

// Cash Net can be negative (cash short).
const signedAmount = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine(isValidSignedAmount, 'Enter an amount like 125.50 or -125.50');

export const lottoReconciliationSchema = z.object({
  bullock: amount,
  bullPayouts: amount,
  bullLottoWinner: amount,
  cashNet: signedAmount,
  // Left blank to continue without attributing; it is due within 3 days.
  attribution: z.union([
    z.literal(''),
    z.literal('employee'),
    z.literal('previous-day'),
    z.literal('next-day'),
  ]),
});
