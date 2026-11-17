import { apiRequest, OfflineError } from '@/lib/api';
import { cachedRead } from '@/lib/cached-read';
import { localDayRange, localDateString } from '@/lib/date';
import type { LocalConsolidation } from '@/lib/ipc';
import { useStaleStore } from '@/lib/stale-store';
import type { UserRole } from '@/features/auth/constants';
import type {
  ConsolidatedShifts,
  ReviewShift,
  ServerShift,
  ShiftWithUser,
} from './types';

// The server's consolidation, whose shift ids are numbers.
type ServerConsolidated = Omit<
  ConsolidatedShifts,
  'shiftIds' | 'incompleteShiftIds'
> & {
  shiftIds: number[];
  incompleteShiftIds: number[];
};

interface ShiftResponse<T> {
  data: T;
}

export async function fetchCurrentShift(
  dbUserId: number,
): Promise<ServerShift | null> {
  const body = await apiRequest<ShiftResponse<ServerShift | null>>(
    `shifts/current?userId=${dbUserId}`,
    undefined,
    'Unable to check your shift.',
  );
  return body.data;
}

// What the server says about today's shifts of a role, saved for when it cannot be reached.
function fetchServerShiftsToday(role?: UserRole): Promise<ShiftWithUser[]> {
  const query = role ? `?role=${role}` : '';
  // Today's date is part of the key: yesterday's saved list must never pass for today's.
  return cachedRead(
    `shifts-today:${localDateString(new Date())}:${role ?? 'all'}`,
    async () => {
      const body = await apiRequest<ShiftResponse<ShiftWithUser[]>>(
        `shifts${query}`,
        undefined,
        'Unable to load the shifts.',
      );
      return body.data;
    },
  );
}

/**
 * Today's shifts of a role: the server's list together with the shifts this device holds, which the server may not
 * know yet (started or finished while offline). When the server cannot be reached the device's shifts are shown on
 * their own, with the notice that this is not the full picture.
 */
export async function fetchShiftsToday(
  role?: UserRole,
): Promise<ReviewShift[]> {
  const local = await (window.api?.shifts.today({
    ...localDayRange(new Date()),
    role,
  }) ?? Promise.resolve([]));

  let server: ShiftWithUser[] = [];
  try {
    server = await fetchServerShiftsToday(role);
  } catch (error) {
    // Nothing saved from the server and nothing on this device either: the original error is the honest answer.
    if (!(error instanceof OfflineError) || local.length === 0) throw error;
    useStaleStore
      .getState()
      .markStale('this-device-only', new Date().toISOString());
  }

  const byClientId = new Map(local.map((shift) => [shift.clientId, shift]));
  const matched = new Set<string>();
  const merged: ReviewShift[] = server.map((shift) => {
    const mine = shift.clientId ? byClientId.get(shift.clientId) : undefined;
    if (mine) matched.add(mine.clientId);
    return {
      key: String(shift.id),
      id: shift.id,
      clientId: shift.clientId,
      userId: shift.userId,
      userName: shift.userName,
      startTime: shift.startTime,
      // Finished on this device but the close has not reached the server yet.
      endTime: shift.endTime ?? mine?.endTime ?? null,
      onDevice: mine !== undefined,
    };
  });
  for (const shift of local) {
    if (matched.has(shift.clientId)) continue;
    merged.push({
      key: shift.id === null ? shift.clientId : String(shift.id),
      id: shift.id,
      clientId: shift.clientId,
      userId: shift.userId,
      userName: shift.userName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      onDevice: true,
    });
  }
  return merged.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// Adds two sections of figures field by field; a missing section counts as zero.
function addSections<S extends object>(a: S | undefined, b: S | undefined): S {
  const base = a ?? b ?? ({} as S);
  const out: Record<string, number> = {};
  for (const field of Object.keys(base)) {
    const left = (a as Record<string, number> | undefined)?.[field] ?? 0;
    const right = (b as Record<string, number> | undefined)?.[field] ?? 0;
    out[field] = left + right;
  }
  return out as S;
}

function combine(
  server: ConsolidatedShifts | null,
  local: LocalConsolidation | null,
  keys: { server: string[]; local: Map<string, string> },
): ConsolidatedShifts {
  return {
    shiftIds: [...keys.server, ...keys.local.values()],
    incompleteShiftIds: [
      ...(server?.incompleteShiftIds ?? []),
      ...(local?.incompleteClientIds ?? []).map(
        (clientId) => keys.local.get(clientId) ?? clientId,
      ),
    ],
    creditTotals: addSections(server?.creditTotals, local?.creditTotals),
    dailySummary: addSections(server?.dailySummary, local?.dailySummary),
    payoutsAndCash: addSections(server?.payoutsAndCash, local?.payoutsAndCash),
  };
}

// Sums what the cashiers entered for the given shifts. A shift this device holds is summed from the records saved
// here, which are never behind the server's; the rest are asked of the server.
export async function fetchConsolidatedShifts(
  shifts: ReviewShift[],
): Promise<ConsolidatedShifts> {
  const onDevice = shifts.filter((s) => s.onDevice && s.clientId !== null);
  const serverOnly = shifts.filter(
    (s) => !onDevice.includes(s) && s.id !== null,
  );

  const serverIds = serverOnly
    .map((s) => s.id)
    .filter((id): id is number => id !== null)
    .sort((a, b) => a - b);
  const [server, local] = await Promise.all([
    serverIds.length > 0
      ? cachedRead(`consolidated:${serverIds.join(',')}`, async () => {
          const body = await apiRequest<ShiftResponse<ServerConsolidated>>(
            'shifts/consolidated',
            { method: 'POST', body: JSON.stringify({ shiftIds: serverIds }) },
            'Unable to load the consolidated values.',
          );
          return body.data;
        })
      : Promise.resolve(null),
    onDevice.length > 0 && window.api
      ? window.api.shifts.consolidate(onDevice.map((s) => s.clientId as string))
      : Promise.resolve(null),
  ]);

  return combine(
    server && {
      ...server,
      shiftIds: server.shiftIds.map(String),
      incompleteShiftIds: server.incompleteShiftIds.map(String),
    },
    local,
    {
      server: serverOnly.map((s) => s.key),
      local: new Map(onDevice.map((s) => [s.clientId as string, s.key])),
    },
  );
}
