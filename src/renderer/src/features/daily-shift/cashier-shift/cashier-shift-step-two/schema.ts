import { z } from 'zod';
import {
  isValidAmount,
  isValidSignedAmount,
  parseAmountToCents,
  parseSignedAmountToCents,
} from '@/lib/money';

const amount = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine(isValidAmount, 'Enter an amount like 125.50');

// Penny rounding can be negative.
const signedAmount = z
  .string()
  .trim()
  .min(1, 'Required')
  .refine(isValidSignedAmount, 'Enter an amount like 0.02 or -0.02');

// The prefilled shift number is the shift id, so it is a parameter: changing
// it is what requires a reason.
const dailySummaryShape = z.object({
  dayEndDate: z.string().min(1, 'Required'),
  dayEndTime: z.string().min(1, 'Required'),
  shiftNumber: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, 'Enter a whole number, 1 or more'),
  shiftChangeReason: z.string().trim(),
  fuelSales: amount,
  itemSales: amount,
  gst: amount,
  hst: amount,
  pennyRounding: signedAmount,
  totalSales: amount,
});

export function createDailySummarySchema(
  defaultShiftNumber: string,
): typeof dailySummaryShape {
  return dailySummaryShape.superRefine((values, ctx) => {
    const shiftChanged = values.shiftNumber.trim() !== defaultShiftNumber;
    if (
      shiftChanged &&
      /^[1-9]\d*$/.test(values.shiftNumber) &&
      values.shiftChangeReason === ''
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['shiftChangeReason'],
        message: 'Give a reason for changing the shift number',
      });
    }

    const parts = [
      [values.fuelSales, isValidAmount, parseAmountToCents],
      [values.itemSales, isValidAmount, parseAmountToCents],
      [values.gst, isValidAmount, parseAmountToCents],
      [values.hst, isValidAmount, parseAmountToCents],
      [values.pennyRounding, isValidSignedAmount, parseSignedAmountToCents],
      [values.totalSales, isValidAmount, parseAmountToCents],
    ] as const;
    if (!parts.every(([value, isValid]) => isValid(value.trim()))) return;

    const [fuel, item, gst, hst, penny, total] = parts.map(([value, , parse]) =>
      parse(value.trim()),
    );
    if (fuel + item + gst + hst + penny !== total) {
      ctx.addIssue({
        code: 'custom',
        path: ['totalSales'],
        message:
          'Fuel Sales to Penny Rounding do not add up to Total Sales. Please verify the numbers.',
      });
    }
  });
}
