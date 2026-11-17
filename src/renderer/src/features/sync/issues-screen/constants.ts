import type { WaitingReason } from '@/features/sync/waiting';

// What each kind of saved change is called for the person reading the list.
export const ENTITY_LABELS: Record<string, string> = {
  'shift-start': 'Start of a shift',
  'shift-close': 'End of a shift',
  'credit-totals': 'Credit totals',
  'daily-summary': 'Daily summary',
  payouts: 'Payouts and cash on hand',
  fuel: 'Fuel entries',
  'fuel-delivery': 'Fuel delivery',
  'fuel-dip': 'Fuel dips',
  'scratch-tickets': 'Instant scratch tickets',
  'lotto-report': 'Lotto reports',
  'lotto-reconciliation': 'Lotto reconciliation',
};

export const SHIFT_START_ENTITY = 'shift-start';

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Why a change has not gone out yet, in the words shown on the screen.
export function reasonText(reason: WaitingReason): string {
  switch (reason.kind) {
    case 'sending': {
      return 'Sending now.';
    }
    case 'sign-in': {
      return 'Waiting for the person who made it to sign in again.';
    }
    case 'offline': {
      return 'Waiting for a connection to the server.';
    }
    case 'earlier-change': {
      return 'Waiting for an earlier change of the same shift to go first.';
    }
    case 'retry': {
      return `The server had a problem (${reason.message}). Trying again at ${formatTime(reason.at)}.`;
    }
    case 'queued': {
      return 'Queued to be sent.';
    }
  }
}
