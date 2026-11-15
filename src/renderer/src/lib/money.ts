// Money is handled as integer minor units (cents); strings only at the edge.
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function isValidAmount(value: string): boolean {
  return AMOUNT_PATTERN.test(value);
}

// "12.5" -> 1250. Pure string maths so no float rounding can creep in.
export function parseAmountToCents(value: string): number {
  if (!isValidAmount(value)) throw new RangeError(`Invalid amount: ${value}`);
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

// 1250 -> "12.50", -2 -> "-0.02"
export function formatCentsAsAmount(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

// Same as above but allows a leading "-", e.g. penny rounding of "-0.02".
const SIGNED_AMOUNT_PATTERN = /^-?\d+(\.\d{1,2})?$/;

export function isValidSignedAmount(value: string): boolean {
  return SIGNED_AMOUNT_PATTERN.test(value);
}

export function parseSignedAmountToCents(value: string): number {
  if (!isValidSignedAmount(value)) {
    throw new RangeError(`Invalid amount: ${value}`);
  }
  const negative = value.startsWith('-');
  const cents = parseAmountToCents(negative ? value.slice(1) : value);
  return negative ? -cents : cents;
}
