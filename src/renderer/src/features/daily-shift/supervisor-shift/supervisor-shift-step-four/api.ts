import type { FuelDipsData } from '@/features/daily-shift/supervisor-shift/types';
import type { FuelDipsRequest } from './types';

// The date and time are entered in local time; send an absolute instant.
const toInstant = (date: string, time: string): string =>
  new Date(`${date}T${time}`).toISOString();

const toLitres = (hundredths: number): number => hundredths / 100;

export function buildFuelDipsRequest(
  ids: { shiftClientId: string; userId: number },
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
