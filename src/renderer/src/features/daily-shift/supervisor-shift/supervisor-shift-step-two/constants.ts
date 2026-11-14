import type { FuelRequestGrade, FuelValues } from './types';

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

// Request field prefix for each grade, in FUEL_GRADES order.
export const FUEL_REQUEST_KEYS: readonly FuelRequestGrade[] = [
  'biodiesel',
  'reg87',
  'extra89',
  'supr91',
  'plus93',
];
