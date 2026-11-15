import { z } from 'zod';

const count = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Enter a whole number, 0 or more');

export const scratchTicketsSchema = z
  .object({
    shiftNumber: z
      .string()
      .trim()
      .regex(/^[1-9]\d*$/, 'Enter a whole number, 1 or more'),
    rows: z.array(
      z.object({
        open: count,
        close: count,
        activations: count,
      }),
    ),
  })
  .superRefine((values, ctx) => {
    for (const [index, row] of values.rows.entries()) {
      const [open, close, activations] = [
        row.open,
        row.close,
        row.activations,
      ].map((v) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : null));
      if (open === null || close === null || activations === null) continue;
      if (close > open + activations) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', index, 'close'],
          message: 'Close cannot be more than Open + Activations',
        });
      }
    }
  });
