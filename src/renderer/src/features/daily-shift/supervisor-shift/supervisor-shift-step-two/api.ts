import type { FuelData } from '@/features/daily-shift/supervisor-shift/types';
import { ApiError, apiRequest } from '@/lib/api';
import { FUEL_REQUEST_KEYS } from './constants';
import type { FuelRequest } from './types';

const toUnits = (hundredths: number): number => hundredths / 100;

export function buildFuelRequest(
  ids: { shiftId: number; userId: number },
  fuel: FuelData,
): FuelRequest {
  const request: FuelRequest = {
    ...ids,
    biodieselVolume: 0,
    biodieselTotal: 0,
    reg87Volume: 0,
    reg87Total: 0,
    extra89Volume: 0,
    extra89Total: 0,
    supr91Volume: 0,
    supr91Total: 0,
    plus93Volume: 0,
    plus93Total: 0,
    totalVolume: toUnits(fuel.totalVolumeCentiLitres),
  };
  for (const [index, entry] of fuel.grades.entries()) {
    const key = FUEL_REQUEST_KEYS[index];
    request[`${key}Volume`] = toUnits(entry.volumeCentiLitres);
    request[`${key}Total`] = toUnits(entry.totalCents);
  }
  return request;
}

// 409 means the API already holds fuel for this shift (an earlier try got
// through but its answer was lost, or the user came back to this step).
export async function saveFuel(request: FuelRequest): Promise<void> {
  try {
    await apiRequest(
      'fuel',
      { method: 'POST', body: JSON.stringify(request) },
      'Saving the fuel entries failed.',
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return;
    throw error;
  }
}
