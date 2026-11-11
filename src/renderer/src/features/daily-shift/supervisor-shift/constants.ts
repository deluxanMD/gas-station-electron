import { ReviewShifts } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-one';
import { FuelEntry } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-two';
import { FuelDelivery } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-three';
import { FuelDips } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-four';
import { GreenbookReport } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-five';
import type { SupervisorStep } from './types';

// Windows follow the Assistant Manager/Shift Lead "Close Day" workflow.
// Each is a placeholder until its screen is designed.
export const SUPERVISOR_STEPS: readonly SupervisorStep[] = [
  {
    id: 'review-shifts',
    title: 'Review Shifts',
    formId: 'review-shifts-form',
    component: ReviewShifts,
  },
  {
    id: 'fuel',
    title: 'Fuel',
    formId: 'fuel-form',
    component: FuelEntry,
  },
  {
    id: 'fuel-delivery',
    title: 'Fuel Delivery',
    formId: 'fuel-delivery-form',
    component: FuelDelivery,
  },
  {
    id: 'fuel-dips',
    title: 'Add Fuel Dips',
    formId: 'fuel-dips-form',
    component: FuelDips,
  },
  {
    id: 'greenbook-variance-report',
    title: 'Greenbook Variance Report',
    component: GreenbookReport,
  },
];
