import { discardDrafts } from '@/features/daily-shift/drafts';
import type { Shift } from './types';
import { useShiftStore } from './shift-store';
import type { ShiftsApi, ShiftWriteInput } from '@/lib/ipc';

// Shifts live on this device; the preload API exists only inside the desktop app.
function shiftsApi(): ShiftsApi {
  const api = window.api?.shifts;
  if (!api)
    throw new Error('Saving on this device is not available in this window.');
  return api;
}

export const currentLocalShift = (userId: number): Promise<Shift | null> =>
  shiftsApi().current(userId);

export const startLocalShift: ShiftsApi['start'] = (userId, who) =>
  shiftsApi().start(userId, who);

export const adoptServerShift: ShiftsApi['adopt'] = (input) =>
  shiftsApi().adopt(input);

/**
 * Saves the shift's records and ends it, all together, on this device: nothing here waits for the server, which
 * receives it all when it can be reached. The shift counts as closed from this moment.
 */
export async function finishShift(
  shift: Shift,
  writes: ShiftWriteInput[],
): Promise<void> {
  await shiftsApi().finish({ clientId: shift.clientId, writes });
  // Saved: the half-entered figures are no longer wanted. This also keeps the flow's own reset from rewriting them.
  discardDrafts();
  useShiftStore.getState().setCurrent({ status: 'none' });
}
