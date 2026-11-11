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
  // Label of the shell's button on the last step; defaults to "Finish".
  finishLabel?: string;
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

// The OLG slips the manager copies figures from.
export type LottoColumn = 'yesterday' | 'fullDay' | 'dayEnd';

export type LottoInputRow =
  | 'onlineNetSales'
  | 'onlineCashRedem'
  | 'sportsProline'
  | 'sportsPools'
  | 'sportsVoids'
  | 'sportsCashRedem'
  | 'instantCashRedem'
  | 'giftSales'
  | 'giftVoids'
  | 'giftCashOut'
  | 'decliningBalance'
  | 'declinedOffer'
  | 'netPromotion'
  | 'freeOnline'
  | 'freeInstant'
  | 'activations';

export interface LottoReportsData {
  dates: Record<LottoColumn, string>; // YYYY-MM-DD, '' when not entered
  reportTimes: Record<LottoColumn, string>; // HH:mm, '' when not entered
  columns: Record<LottoColumn, Record<LottoInputRow, number>>; // cents
  // Terminal net for the day: day-end slip minus the previous day's.
  netTerminalCents: number;
  // Net (day end less previous day) figures the reconciliation needs.
  netOnlineCents: number;
  cashRedemCents: number; // On-Line + Sports + Instant cash redemptions
  activationsCents: number;
}

export type LossAttribution = '' | 'employee' | 'previous-day' | 'next-day';

export interface LottoReconciliationData {
  bullockCents: number;
  bullPayoutsCents: number;
  bullLottoWinnerCents: number;
  cashNetCents: number;
  // '' means over/short is not attributed yet; due within 3 days.
  attribution: LossAttribution;
  totalCents: number;
}

export interface ManagerShiftState {
  scratchTickets: ScratchTicketsData | null;
  setScratchTickets: (data: ScratchTicketsData) => void;
  lottoReports: LottoReportsData | null;
  setLottoReports: (data: LottoReportsData) => void;
  lottoReconciliation: LottoReconciliationData | null;
  setLottoReconciliation: (data: LottoReconciliationData) => void;
}

export interface UseStepper {
  stepIndex: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  back: () => void;
}
