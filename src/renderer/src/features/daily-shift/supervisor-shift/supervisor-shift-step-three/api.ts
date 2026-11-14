import { ApiError, apiRequest } from '@/lib/api';
import type { FuelDeliveryEntry } from '@/features/daily-shift/supervisor-shift/types';
import type { FuelDeliveryRequest } from './types';

const toLitres = (hundredths: number): number => hundredths / 100;

export function buildFuelDeliveryRequest(
  ids: { shiftId: number; userId: number },
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

// 409 means this bill of lading is already saved for the shift (an earlier try
// got through, or the user came back to this step), so it counts as saved.
export async function saveFuelDelivery(
  request: FuelDeliveryRequest,
): Promise<void> {
  try {
    await apiRequest(
      'fuel-deliveries',
      { method: 'POST', body: JSON.stringify(request) },
      'Saving the fuel delivery failed.',
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return;
    throw error;
  }
}
