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
