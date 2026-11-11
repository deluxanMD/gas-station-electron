import type { FuelValues } from './types';

export const FUEL_GRADES = [
  'BIODIESEL',
  'REG-87',
  'EXTRA-89',
  'SUPR-91',
  'PLUS-93',
] as const;

export const EMPTY_FUEL: FuelValues = {
  grades: FUEL_GRADES.map(() => ({ volume: '', total: '' })),
  totalVolume: '',
};
