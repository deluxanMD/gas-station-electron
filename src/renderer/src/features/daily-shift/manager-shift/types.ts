import type { ComponentType } from 'react';

export interface ManagerShiftProps {
  // Leaves the flow, e.g. back to the home screen.
  onExit: () => void;
}

// Passed to every step so the shell's Next button can submit a step's form.
export interface ManagerStepProps {
  formId: string;
  onNext: () => void;
}

export interface ManagerStep {
  id: string;
  title: string;
  // Set when the step is a form; Next then submits that form.
  formId?: string;
  component: ComponentType<ManagerStepProps>;
}

export interface ScratchTicketRow {
  denomination: number; // whole dollars
  openCount: number;
  closeCount: number;
  activationsCount: number;
  soldCount: number;
  amountCents: number;
}

export interface ScratchTicketsData {
  shiftNumber: number;
  rows: ScratchTicketRow[];
  totalAmountCents: number;
}

export interface ManagerShiftState {
  scratchTickets: ScratchTicketsData | null;
  setScratchTickets: (data: ScratchTicketsData) => void;
}

export interface UseStepper {
  stepIndex: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  back: () => void;
}
