import type { FuelDeliveryValues, FuelVolumeField } from './types';

export const FUEL_DELIVERY_VOLUME_FIELDS: readonly {
  name: FuelVolumeField;
  label: string;
}[] = [
  { name: 'reg', label: 'REG' },
  { name: 'prem', label: 'PREM' },
  { name: 'diesel', label: 'DIESEL' },
];

export const EMPTY_FUEL_DELIVERY: FuelDeliveryValues = {
  date: '',
  bolNumber: '',
  reg: '',
  prem: '',
  diesel: '',
  total: '',
};
