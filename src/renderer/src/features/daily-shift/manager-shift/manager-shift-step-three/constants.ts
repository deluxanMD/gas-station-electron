import type { ScratchTicketsValues } from './types';

export const SCRATCH_DENOMINATIONS = [
  1, 2, 3, 4, 5, 10, 20, 25, 30, 50, 100,
] as const;

// Open is prefilled with 0 until previous shift closes are stored.
export const EMPTY_SCRATCH_TICKETS: ScratchTicketsValues = {
  shiftNumber: '',
  rows: SCRATCH_DENOMINATIONS.map(() => ({
    open: '0',
    close: '',
    activations: '',
  })),
};
