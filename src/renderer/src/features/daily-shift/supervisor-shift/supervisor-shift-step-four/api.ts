import { ApiError, apiRequest } from '@/lib/api';
import type { FuelDipsData } from '@/features/daily-shift/supervisor-shift/types';
import type { FuelDipsRequest } from './types';

// The date and time are entered in local time; send an absolute instant.
const toInstant = (date: string, time: string): string =>
  new Date(`${date}T${time}`).toISOString();

const toLitres = (hundredths: number): number => hundredths / 100;

export function buildFuelDipsRequest(
  ids: { shiftId: number; userId: number },
  dips: FuelDipsData,
): FuelDipsRequest {
  const request: FuelDipsRequest = {
    ...ids,
    dipAt: toInstant(dips.date, dips.time),
    regularTcVolume: 0,
    regularUllage90: 0,
    premiumTcVolume: 0,
    premiumUllage90: 0,
    dieselTcVolume: 0,
    dieselUllage90: 0,
  };
  for (const entry of dips.products) {
    const key = entry.product.toLowerCase() as 'regular' | 'premium' | 'diesel';
    request[`${key}TcVolume`] = toLitres(entry.tcVolumeCentiLitres);
    request[`${key}Ullage90`] = toLitres(entry.ullage90CentiLitres);
  }
  return request;
}

// 409 means the API already holds the dips for this shift (an earlier try got
// through but its answer was lost), so it counts as saved.
export async function saveFuelDips(request: FuelDipsRequest): Promise<void> {
  try {
    await apiRequest(
      'fuel-dips',
      { method: 'POST', body: JSON.stringify(request) },
      'Saving the fuel dips failed.',
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return;
    throw error;
  }
}
