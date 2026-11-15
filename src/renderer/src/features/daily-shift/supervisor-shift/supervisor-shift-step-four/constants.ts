import type { FuelDipsValues } from './types';

export const DIP_PRODUCTS = ['REGULAR', 'PREMIUM', 'DIESEL'] as const;

export const EMPTY_FUEL_DIPS: FuelDipsValues = {
  date: '',
  time: '',
  products: DIP_PRODUCTS.map(() => ({ tcVolume: '', ullage90: '' })),
};
