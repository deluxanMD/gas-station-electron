import type { DailySummaryAmountField, DailySummaryValues } from './types';

// Until shift history is stored, the next shift number is assumed to be 1.
export const DEFAULT_SHIFT_NUMBER = 1;

export const DAILY_SUMMARY_AMOUNT_FIELDS: readonly {
  name: DailySummaryAmountField;
  label: string;
}[] = [
  { name: 'fuelSales', label: 'Fuel Sales' },
  { name: 'itemSales', label: 'Item Sales' },
  { name: 'gst', label: 'GST' },
  { name: 'hst', label: 'HST' },
  { name: 'pennyRounding', label: 'Penny Rounding' },
  { name: 'totalSales', label: 'Total Sales' },
];

export const EMPTY_DAILY_SUMMARY: DailySummaryValues = {
  dayEndDate: '',
  dayEndTime: '',
  shiftNumber: String(DEFAULT_SHIFT_NUMBER),
  shiftChangeReason: '',
  fuelSales: '',
  itemSales: '',
  gst: '',
  hst: '',
  pennyRounding: '',
  totalSales: '',
};
