import { ReviewCashierReports } from '@/features/daily-shift/manager-shift/manager-shift-step-one';
import { GreenbookVariance } from '@/features/daily-shift/manager-shift/manager-shift-step-two';
import { InstantScratchTickets } from '@/features/daily-shift/manager-shift/manager-shift-step-three';
import { LottoReports } from '@/features/daily-shift/manager-shift/manager-shift-step-four';
import { LottoReconciliation } from '@/features/daily-shift/manager-shift/manager-shift-step-five';
import type { ManagerStep } from './types';

// Windows follow the Manager part of the daily workflow.
// Each is a placeholder until its screen is designed.
export const MANAGER_STEPS: readonly ManagerStep[] = [
  {
    id: 'review-cashier-reports',
    title: 'Review Cashier Reports',
    component: ReviewCashierReports,
  },
  {
    id: 'greenbook-variance-report',
    title: 'Greenbook Variance Report',
    component: GreenbookVariance,
  },
  {
    id: 'instant-scratch-tickets',
    title: 'Instant Scratch Tickets',
    formId: 'instant-scratch-tickets-form',
    component: InstantScratchTickets,
  },
  {
    id: 'lotto-reports',
    title: 'Lotto Reports',
    formId: 'lotto-reports-form',
    component: LottoReports,
  },
  {
    id: 'lotto-reconciliation',
    title: 'Lotto Reconciliation',
    formId: 'lotto-reconciliation-form',
    finishLabel: 'Post and Close',
    component: LottoReconciliation,
  },
];
