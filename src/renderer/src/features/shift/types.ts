export interface Shift {
  id: number;
  // The API's numeric id of the user who owns the shift.
  userId: number;
  startTime: string;
  endTime: string | null;
}

export type CurrentShift =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'none' }
  | { status: 'open'; shift: Shift };

export interface ShiftStoreState {
  current: CurrentShift;
  setCurrent: (current: CurrentShift) => void;
}

export interface UseStartShift {
  start: () => void;
  starting: boolean;
  error: string | null;
}

export interface UseFinishShift {
  finish: () => void;
  closing: boolean;
  error: string | null;
}
