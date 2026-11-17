import { useShiftStore } from './shift-store';
import type { Shift } from './types';

// The client id of the shift seedOpenShift opens.
export const SHIFT_CLIENT_ID = '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90';

export function seedOpenShift(overrides: Partial<Shift> = {}): void {
  useShiftStore.setState({
    current: {
      status: 'open',
      shift: {
        clientId: SHIFT_CLIENT_ID,
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
