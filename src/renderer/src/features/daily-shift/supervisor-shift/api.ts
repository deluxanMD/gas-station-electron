import { buildFuelRequest, saveFuel } from './supervisor-shift-step-two/api';
import {
  buildFuelDeliveryRequest,
  saveFuelDelivery,
} from './supervisor-shift-step-three/api';
import type { FuelData, FuelDeliveryEntry } from './types';

// Saves the shift's fuel, then its delivery if one was entered.
export async function saveSupervisorShift(
  ids: { shiftId: number; userId: number },
  data: { fuel: FuelData; fuelDelivery: FuelDeliveryEntry | null },
): Promise<void> {
  await saveFuel(buildFuelRequest(ids, data.fuel));
  if (data.fuelDelivery) {
    await saveFuelDelivery(buildFuelDeliveryRequest(ids, data.fuelDelivery));
  }
}
