import { buildFuelRequest, saveFuel } from './supervisor-shift-step-two/api';
import {
  buildFuelDeliveryRequest,
  saveFuelDelivery,
} from './supervisor-shift-step-three/api';
import {
  buildFuelDipsRequest,
  saveFuelDips,
} from './supervisor-shift-step-four/api';
import type { FuelData, FuelDeliveryEntry, FuelDipsData } from './types';

// Saves what the steps collected: fuel, the delivery if one was entered, dips.
export async function saveSupervisorShift(
  ids: { shiftId: number; userId: number },
  data: {
    fuel: FuelData;
    fuelDelivery: FuelDeliveryEntry | null;
    fuelDips: FuelDipsData;
  },
): Promise<void> {
  await saveFuel(buildFuelRequest(ids, data.fuel));
  if (data.fuelDelivery) {
    await saveFuelDelivery(buildFuelDeliveryRequest(ids, data.fuelDelivery));
  }
  await saveFuelDips(buildFuelDipsRequest(ids, data.fuelDips));
}
