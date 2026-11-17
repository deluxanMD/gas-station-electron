import { apiRequest } from '@/lib/api';
import type { UserRole } from '@/features/auth/constants';
import type { ConsolidatedShifts, ServerShift, ShiftWithUser } from './types';

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

export async function fetchShiftsToday(
  role?: UserRole,
): Promise<ShiftWithUser[]> {
  const query = role ? `?role=${role}` : '';
  const body = await apiRequest<ShiftResponse<ShiftWithUser[]>>(
    `shifts${query}`,
    undefined,
    'Unable to load the shifts.',
  );
  return body.data;
}

// Sums what the cashiers entered for the given shifts.
export async function fetchConsolidatedShifts(
  shiftIds: number[],
): Promise<ConsolidatedShifts> {
  const body = await apiRequest<ShiftResponse<ConsolidatedShifts>>(
    'shifts/consolidated',
    { method: 'POST', body: JSON.stringify({ shiftIds }) },
    'Unable to load the consolidated values.',
  );
  return body.data;
}
