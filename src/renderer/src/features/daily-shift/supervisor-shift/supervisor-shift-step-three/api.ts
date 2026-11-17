import type { FuelDeliveryEntry } from '@/features/daily-shift/supervisor-shift/types';
import type { FuelDeliveryRequest } from './types';

const toLitres = (hundredths: number): number => hundredths / 100;

export function buildFuelDeliveryRequest(
  ids: { shiftClientId: string; userId: number },
  delivery: FuelDeliveryEntry,
): FuelDeliveryRequest {
  return {
    ...ids,
    deliveryDate: delivery.date,
    bolNumber: delivery.bolNumber,
    reg: toLitres(delivery.regCentiLitres),
    prem: toLitres(delivery.premCentiLitres),
    diesel: toLitres(delivery.dieselCentiLitres),
    total: toLitres(delivery.totalCentiLitres),
  };
}
