import { describe, expect, it } from 'vitest';
import {
  formatCentsAsAmount,
  isValidAmount,
  isValidSignedAmount,
  parseAmountToCents,
  parseSignedAmountToCents,
} from './money';

describe('money', () => {
  it('parses amounts to integer cents', () => {
    expect(parseAmountToCents('12')).toBe(1200);
    expect(parseAmountToCents('12.5')).toBe(1250);
    expect(parseAmountToCents('0.07')).toBe(7);
    expect(parseAmountToCents('1234.56')).toBe(123_456);
  });

  it('rejects malformed amounts', () => {
    for (const value of ['', '-1', '1.234', 'abc', '1,5', '.5']) {
      expect(isValidAmount(value)).toBe(false);
    }
    expect(() => parseAmountToCents('abc')).toThrow(RangeError);
  });

  it('formats cents back to a two-decimal amount', () => {
    expect(formatCentsAsAmount(1250)).toBe('12.50');
    expect(formatCentsAsAmount(7)).toBe('0.07');
    expect(formatCentsAsAmount(0)).toBe('0.00');
    expect(formatCentsAsAmount(-2)).toBe('-0.02');
    expect(formatCentsAsAmount(-1250)).toBe('-12.50');
  });

  it('handles signed amounts', () => {
    expect(isValidSignedAmount('-0.02')).toBe(true);
    expect(isValidSignedAmount('--1')).toBe(false);
    expect(parseSignedAmountToCents('-0.02')).toBe(-2);
    expect(parseSignedAmountToCents('1.5')).toBe(150);
  });
});
