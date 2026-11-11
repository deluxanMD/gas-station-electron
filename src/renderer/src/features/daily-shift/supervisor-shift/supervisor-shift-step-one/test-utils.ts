import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';

// Puts one fully entered cashier shift in the store, as if just closed.
export function seedClosedShift(posMismatch = false): void {
  useCashierShiftStore.setState({
    creditTotals: {
      creditTerminalCents: 1000,
      creditHostCents: 1000,
      debitTerminalCents: 200,
      fleetCents: 0,
      svRedemptionCents: 50,
    },
    dailySummary: {
      dayEndDate: '2026-11-09',
      dayEndTime: '23:30',
      shiftNumber: 1,
      shiftChangeReason: '',
      fuelSalesCents: 6000,
      itemSalesCents: 3000,
      gstCents: 1000,
      hstCents: 0,
      pennyRoundingCents: -2,
      totalSalesCents: 9998,
    },
    cashClose: {
      totalPosCents: posMismatch ? 1200 : 1000,
      posMismatch,
      payouts: [{ description: 'Bread', type: 'vendor', amountCents: 725 }],
      lottoWinnerCents: 500,
      giftCertificatesCents: 0,
      redemptionsCents: 0,
      safedropsCents: 2000,
      cashOnHandCents: 5773,
    },
  });
}
