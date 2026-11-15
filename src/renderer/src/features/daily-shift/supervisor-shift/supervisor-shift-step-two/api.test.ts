import { describe, expect, it } from 'vitest';
import { buildFuelRequest } from './api';
import { FUEL_GRADES } from './constants';

describe('buildFuelRequest', () => {
  it('converts hundredths to litres and dollars, one pair per grade', () => {
    const request = buildFuelRequest(
      { shiftId: 3, userId: 8 },
      {
        grades: FUEL_GRADES.map((grade, index) => ({
          grade,
          volumeCentiLitres: (index + 1) * 10_050,
          totalCents: (index + 1) * 2575,
        })),
        totalVolumeCentiLitres: 150_750,
      },
    );

    expect(request).toEqual({
      shiftId: 3,
      userId: 8,
      biodieselVolume: 100.5,
      biodieselTotal: 25.75,
      reg87Volume: 201,
      reg87Total: 51.5,
      extra89Volume: 301.5,
      extra89Total: 77.25,
      supr91Volume: 402,
      supr91Total: 103,
      plus93Volume: 502.5,
      plus93Total: 128.75,
      totalVolume: 1507.5,
    });
  });
});
