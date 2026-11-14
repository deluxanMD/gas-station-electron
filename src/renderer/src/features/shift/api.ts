import { apiRequest } from '@/lib/api';
import type { UserRole } from '@/features/auth/constants';
import type { Shift, ShiftWithUser } from './types';

interface ShiftResponse<T> {
  data: T;
}

export async function fetchCurrentShift(
  dbUserId: number,
): Promise<Shift | null> {
  const body = await apiRequest<ShiftResponse<Shift | null>>(
    `shifts/current?userId=${dbUserId}`,
    undefined,
    'Unable to check your shift.',
  );
  return body.data;
}

// The API returns the existing open shift if there already is one.
export async function startShift(dbUserId: number): Promise<Shift> {
  const body = await apiRequest<ShiftResponse<Shift>>(
    'shifts',
    { method: 'POST', body: JSON.stringify({ userId: dbUserId }) },
    'Unable to start the shift.',
  );
  return body.data;
}

// Closing an already closed shift succeeds, so a retry is safe.
export async function closeShift(shiftId: number): Promise<void> {
  await apiRequest<ShiftResponse<Shift>>(
    `shifts/${shiftId}/close`,
    { method: 'POST' },
    'Unable to close the shift.',
  );
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
