import { describe, expect, it } from 'vitest';
import { cn, formatDateTime } from '@/lib/utils';

describe('cn', () => {
  it('joins class names and skips falsy values', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b');
  });

  it('lets later Tailwind classes override earlier conflicting ones', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('formatDateTime', () => {
  it('includes both the date and the time', () => {
    expect(formatDateTime('2026-11-13T09:30:00Z', 'en-US', 'UTC')).toBe(
      'Nov 13, 2026, 9:30 AM',
    );
  });

  it('converts the UTC instant to the given time zone', () => {
    expect(
      formatDateTime('2026-11-13T23:30:00Z', 'en-US', 'Asia/Colombo'),
    ).toBe('Nov 14, 2026, 5:00 AM');
  });
});
