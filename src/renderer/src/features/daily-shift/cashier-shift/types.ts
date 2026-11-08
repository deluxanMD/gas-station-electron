import type { ComponentType } from 'react';

export interface CashierShiftProps {
  // Leaves the flow, e.g. back to the home screen.
  onExit: () => void;
}

export interface ShiftStep {
  id: string;
  title: string;
  component: ComponentType;
}

export interface UseStepper {
  stepIndex: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  back: () => void;
}
