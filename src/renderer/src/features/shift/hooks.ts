import { useEffect, useState } from 'react';
import { useAuthStore } from '@/features/auth/auth-store';
import {
  activateDrafts,
  deactivateDrafts,
} from '@/features/daily-shift/drafts';
import { useCan } from '@/features/auth/hooks';
import { ApiError } from '@/lib/api';
import { fetchCurrentShift } from './api';
import {
  adoptServerShift,
  currentLocalShift,
  finishShift,
  startLocalShift,
} from './local';
import { useShiftStore } from './shift-store';
import type {
  ServerShift,
  Shift,
  UseFinishShift,
  UseStartShift,
} from './types';

// Who the signed-in user is, kept with the shift so a review list can name it when only this device knows it.
function currentOwner(): { userName: string; role: string | null } | undefined {
  const { user } = useAuthStore.getState();
  return user ? { userName: user.userId, role: user.userRole } : undefined;
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Reads the user's open shift into the store; also the retry action. The shift on this device comes first. Only when
// there is none is the server asked (a shift started on another device); if it cannot be reached the user can still
// start one here.
export async function loadCurrentShift(dbUserId: number): Promise<void> {
  const { setCurrent } = useShiftStore.getState();
  const isStale = (): boolean => useAuthStore.getState().dbUserId !== dbUserId;
  setCurrent({ status: 'loading' });
  try {
    const local = await currentLocalShift(dbUserId);
    if (isStale()) return;
    if (local) {
      await activateDrafts(dbUserId, local.clientId);
      if (isStale()) return;
      setCurrent({ status: 'open', shift: local });
      return;
    }

    let server: ServerShift | null = null;
    try {
      server = await fetchCurrentShift(dbUserId);
    } catch (error) {
      // The server answered with an error: that is a real problem. No answer just means offline.
      if (error instanceof ApiError) throw error;
    }
    if (isStale()) return;
    if (!server) {
      deactivateDrafts();
      setCurrent({ status: 'none' });
      return;
    }
    const adopted = await adoptServerShift({
      userId: dbUserId,
      userName: currentOwner()?.userName,
      role: currentOwner()?.role,
      id: server.id,
      clientId: server.clientId,
      startTime: server.startTime,
    });
    if (isStale()) return;
    await activateDrafts(dbUserId, adopted.clientId);
    if (isStale()) return;
    setCurrent({ status: 'open', shift: adopted });
  } catch (error) {
    if (isStale()) return;
    setCurrent({
      status: 'error',
      message: messageOf(error, 'Unable to check your shift.'),
    });
  }
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
      const shift = await startLocalShift(dbUserId, currentOwner());
      await activateDrafts(dbUserId, shift.clientId);
      useShiftStore.getState().setCurrent({ status: 'open', shift });
    } catch (error_) {
      setError(messageOf(error_, 'Unable to start the shift.'));
    } finally {
      setStarting(false);
    }
  };

  return { start: () => void start(), starting, error };
}

// For roles whose last step saves nothing yet: closes the shift, then leaves the
// flow. The other roles close inside their own save instead.
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
      await finishShift(shift, []);
    } catch (error_) {
      setError(messageOf(error_, 'Unable to close the shift.'));
      setClosing(false);
      return;
    }
    onExit();
  };

  return { finish: () => void finish(), closing, error };
}
