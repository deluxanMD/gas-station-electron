import type { DailySummaryAmountField, DailySummaryValues } from './types';

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
  // Prefilled with the shift id at runtime.
  shiftNumber: '',
  shiftChangeReason: '',
  fuelSales: '',
  itemSales: '',
  gst: '',
  hst: '',
  pennyRounding: '',
  totalSales: '',
};
