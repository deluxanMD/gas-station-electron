import { useShiftStore } from './shift-store';
import type { Shift } from './types';

export function seedOpenShift(overrides: Partial<Shift> = {}): void {
  useShiftStore.setState({
    current: {
      status: 'open',
      shift: {
        id: 9,
        userId: 4,
        startTime: '2026-11-09T14:00:00.000Z',
        endTime: null,
        ...overrides,
      },
    },
  });
}

export function resetShiftStore(): void {
  useShiftStore.setState({ current: { status: 'loading' } });
}
