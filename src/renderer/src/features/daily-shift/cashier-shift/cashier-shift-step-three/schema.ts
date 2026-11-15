import { z } from 'zod';
import { isValidAmount } from '@/lib/money';
import { PAYOUT_TYPE_VALUES } from './constants';

const amount = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine(isValidAmount, 'Enter an amount like 125.50');

// A payout row may be left blank, but a started row needs all three cells.
const payoutRow = z
  .object({
    description: z.string().trim(),
    type: z.union([z.literal(''), z.enum(PAYOUT_TYPE_VALUES)]),
    amount: z.string().trim(),
  })
  .superRefine((row, ctx) => {
    const started =
      row.description !== '' || row.type !== '' || row.amount !== '';
    if (!started) return;
    if (row.description === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['description'],
        message: 'Required',
      });
    }
    if (row.type === '') {
      ctx.addIssue({ code: 'custom', path: ['type'], message: 'Required' });
    }
    if (row.amount === '') {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Required' });
    } else if (!isValidAmount(row.amount)) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount'],
        message: 'Enter an amount like 125.50',
      });
    }
  });

export const cashCloseSchema = z.object({
  totalPos: amount,
  payouts: z.array(payoutRow),
  lottoWinner: amount,
  giftCertificates: amount,
  redemptions: amount,
  safedrops: amount,
  cashOnHand: amount,
});
