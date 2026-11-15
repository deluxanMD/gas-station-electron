import { useEffect, useState } from 'react';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCan } from '@/features/auth/hooks';
import { closeShift, fetchCurrentShift, startShift } from './api';
import { useShiftStore } from './shift-store';
import type { Shift, UseFinishShift, UseStartShift } from './types';

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Reads the open shift from the API into the store; also the retry action.
export async function loadCurrentShift(dbUserId: number): Promise<void> {
  const { setCurrent } = useShiftStore.getState();
  setCurrent({ status: 'loading' });
  try {
    const shift = await fetchCurrentShift(dbUserId);
    // Ignore the answer if the user signed out or changed meanwhile.
    if (useAuthStore.getState().dbUserId !== dbUserId) return;
    setCurrent(shift ? { status: 'open', shift } : { status: 'none' });
  } catch (error) {
    if (useAuthStore.getState().dbUserId !== dbUserId) return;
    setCurrent({
      status: 'error',
      message: messageOf(error, 'Unable to check your shift.'),
    });
  }
}

// Ends the shift on the API, then marks it closed locally.
export async function endShift(shiftId: number): Promise<void> {
  await closeShift(shiftId);
  useShiftStore.getState().setCurrent({ status: 'none' });
}

// Mount once for the signed-in area; clears the shift when the user leaves it.
export function useLoadCurrentShift(): void {
  const dbUserId = useAuthStore((s) => s.dbUserId);

  useEffect(() => {
    if (dbUserId === null) return;
    void loadCurrentShift(dbUserId);
    return () => useShiftStore.getState().setCurrent({ status: 'loading' });
  }, [dbUserId]);
}

// The open shift, or null while loading or when none is open.
export function useOpenShift(): Shift | null {
  const current = useShiftStore((s) => s.current);
  return current.status === 'open' ? current.shift : null;
}

export function useStartShift(): UseStartShift {
  const dbUserId = useAuthStore((s) => s.dbUserId);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (): Promise<void> => {
    if (dbUserId === null || starting) return;
    setStarting(true);
    setError(null);
    try {
      const shift = await startShift(dbUserId);
      useShiftStore.getState().setCurrent({ status: 'open', shift });
    } catch (error_) {
      setError(messageOf(error_, 'Unable to start the shift.'));
    } finally {
      setStarting(false);
    }
  };

  return { start: () => void start(), starting, error };
}

// For roles whose last step saves nothing to the API yet: closes the shift,
// then leaves the flow. The cashier closes inside its own save instead.
export function useFinishShift(onExit: () => void): UseFinishShift {
  const shift = useOpenShift();
  const tracksShift = useCan('daily-shift', 'trackShift');
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (): Promise<void> => {
    if (closing) return;
    // Roles that don't track shifts have nothing to close.
    if (!tracksShift) {
      onExit();
      return;
    }
    if (!shift) {
      setError('There is no open shift to close.');
      return;
    }
    setClosing(true);
    setError(null);
    try {
      await endShift(shift.id);
    } catch (error_) {
      setError(messageOf(error_, 'Unable to close the shift.'));
      setClosing(false);
      return;
    }
    onExit();
  };

  return { finish: () => void finish(), closing, error };
}
