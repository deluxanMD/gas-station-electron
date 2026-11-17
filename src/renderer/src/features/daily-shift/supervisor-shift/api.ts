import type { ShiftWriteInput } from '@/lib/ipc';
import { buildFuelRequest } from './supervisor-shift-step-two/api';
import { buildFuelDeliveryRequest } from './supervisor-shift-step-three/api';
import { buildFuelDipsRequest } from './supervisor-shift-step-four/api';
import type { FuelData, FuelDeliveryEntry, FuelDipsData } from './types';

// What the steps collected, as records for the sync engine to send: fuel, the delivery if one was entered, dips.
export function buildSupervisorWrites(
  ids: { shiftClientId: string; userId: number },
  data: {
    fuel: FuelData;
    fuelDelivery: FuelDeliveryEntry | null;
    fuelDips: FuelDipsData;
  },
): ShiftWriteInput[] {
  const writes: ShiftWriteInput[] = [
    {
      entity: 'fuel',
      path: 'fuel',
      payload: { ...buildFuelRequest(ids, data.fuel) },
    },
  ];
  if (data.fuelDelivery) {
    writes.push({
      entity: 'fuel-delivery',
      path: 'fuel-deliveries',
      payload: { ...buildFuelDeliveryRequest(ids, data.fuelDelivery) },
    });
  }
  writes.push({
    entity: 'fuel-dip',
    path: 'fuel-dips',
    payload: { ...buildFuelDipsRequest(ids, data.fuelDips) },
  });
  return writes;
}
