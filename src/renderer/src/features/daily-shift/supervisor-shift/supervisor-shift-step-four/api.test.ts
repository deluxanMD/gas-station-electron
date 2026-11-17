import { describe, expect, it } from 'vitest';
import { buildFuelDipsRequest } from './api';
import { DIP_PRODUCTS } from './constants';

describe('buildFuelDipsRequest', () => {
  it('converts hundredths to litres, one pair per product', () => {
    expect(
      buildFuelDipsRequest(
        { shiftClientId: 'c3', userId: 8 },
        {
          date: '2026-11-09',
          time: '22:15',
          products: DIP_PRODUCTS.map((product, index) => ({
            product,
            tcVolumeCentiLitres: (index + 1) * 1_000_050,
            ullage90CentiLitres: (index + 1) * 250_000,
          })),
        },
      ),
    ).toEqual({
      shiftClientId: 'c3',
      userId: 8,
      dipAt: new Date('2026-11-09T22:15').toISOString(),
      regularTcVolume: 10_000.5,
      regularUllage90: 2500,
      premiumTcVolume: 20_001,
      premiumUllage90: 5000,
      dieselTcVolume: 30_001.5,
      dieselUllage90: 7500,
    });
  });
});
