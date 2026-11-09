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

// 1250 -> "12.50"
export function formatCentsAsAmount(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = String(Math.abs(cents % 100)).padStart(2, '0');
  return `${whole}.${fraction}`;
}
