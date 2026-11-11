import { z } from 'zod';
import { isValidAmount } from '@/lib/money';

// A slip may not be available, so every cell is optional; blank counts as 0.
const cell = z
  .string()
  .trim()
  .refine((v) => v === '' || isValidAmount(v), 'Enter an amount like 125.50');

const slipRow = z.object({ yesterday: cell, fullDay: cell, dayEnd: cell });

export const lottoReportsSchema = z.object({
  dates: z.object({
    yesterday: z.string(),
    fullDay: z.string(),
    dayEnd: z.string(),
  }),
  reportTimes: z.object({
    yesterday: z.string(),
    fullDay: z.string(),
    dayEnd: z.string(),
  }),
  rows: z.object({
    onlineNetSales: slipRow,
    onlineCashRedem: slipRow,
    sportsProline: slipRow,
    sportsPools: slipRow,
    sportsVoids: slipRow,
    sportsCashRedem: slipRow,
    instantCashRedem: slipRow,
    giftSales: slipRow,
    giftVoids: slipRow,
    giftCashOut: slipRow,
    decliningBalance: slipRow,
    declinedOffer: slipRow,
    netPromotion: slipRow,
    freeOnline: slipRow,
    freeInstant: slipRow,
    activations: slipRow,
  }),
});
