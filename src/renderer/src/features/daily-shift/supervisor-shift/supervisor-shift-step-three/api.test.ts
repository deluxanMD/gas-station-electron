import { describe, expect, it } from 'vitest';
import { buildFuelDeliveryRequest } from './api';

describe('buildFuelDeliveryRequest', () => {
  it('converts hundredths to litres', () => {
    expect(
      buildFuelDeliveryRequest(
        { shiftId: 3, userId: 8 },
        {
          date: '2026-11-08',
          bolNumber: 'BOL-1',
          regCentiLitres: 500_000,
          premCentiLitres: 200_050,
          dieselCentiLitres: 300_000,
          totalCentiLitres: 1_000_050,
        },
      ),
    ).toEqual({
      shiftId: 3,
      userId: 8,
      deliveryDate: '2026-11-08',
      bolNumber: 'BOL-1',
      reg: 5000,
      prem: 2000.5,
      diesel: 3000,
      total: 10_000.5,
    });
  });
});
