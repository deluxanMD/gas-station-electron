import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

// Credit totals 10.00 (host and terminal); total sales 100.00.
async function openStepThree(onExit: () => void = () => {}): Promise<void> {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u1', role: 'CASHIER' })}.sig`;
  useAuthStore.getState().signIn(token, 9);
  await render(<DailyShiftScreen onExit={onExit} />);

  await page.getByLabelText('Credit Totals - Terminal').fill('10');
  await page.getByLabelText('Credit Totals - Host').fill('10');
  await page.getByLabelText('Debit - Terminal').fill('0');
  await page.getByLabelText('Fleet').fill('0');
  await page.getByLabelText('SV Redemption').fill('0');
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByLabelText('Day End Date').fill('2026-11-09');
  await page.getByLabelText('Day End Time (AM/PM)').fill('23:30');
  await page.getByLabelText('Fuel Sales').fill('60');
  await page.getByLabelText('Item Sales').fill('30');
  await page.getByLabelText('GST').fill('10');
  await page.getByLabelText('HST').fill('0');
  await page.getByLabelText('Penny Rounding').fill('0');
  await page.getByLabelText('Total Sales').fill('100');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect.element(page.getByText('Step 3 of 3')).toBeVisible();
}

async function fillRest(cashOnHand: string): Promise<void> {
  await page.getByLabelText('Lotto Winner').fill('5');
  await page.getByLabelText('Gift Certificates/Misc.').fill('0');
  await page.getByLabelText('Redemptions').fill('0');
  await page.getByLabelText('Safedrops').fill('20');
  await page.getByLabelText('Cash on Hand').fill(cashOnHand);
}

function byPath(suffix: string): Record<string, unknown> | undefined {
  return posted.find((p) => p.url.endsWith(suffix))?.body;
}

const posted: { url: string; body: Record<string, unknown> }[] = [];

function stubApi(failPath?: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/shifts/')) {
        return Promise.resolve(
          Response.json({ data: { id: 9, userId: 4 } }, { status: 200 }),
        );
      }
      if (failPath && url.endsWith(failPath)) {
        return Promise.resolve(
          Response.json({ message: 'Database down' }, { status: 500 }),
        );
      }
      posted.push({ url, body: JSON.parse(String(init?.body)) });
      return Promise.resolve(Response.json({ data: {} }, { status: 201 }));
    }),
  );
}

describe('Payouts and Cash on Hand window (real browser)', () => {
  beforeEach(() => {
    posted.length = 0;
    stubApi();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().signOut();
    useCashierShiftStore.setState({
      creditTotals: null,
      dailySummary: null,
      cashClose: null,
      savedTables: new Set(),
    });
    localStorage.clear();
  });

  it('flags a started payout row with missing cells', async () => {
    await openStepThree();
    await page.getByLabelText('Total POS (Card Sales)').fill('10');
    await fillRest('50');
    await page.getByLabelText('Payout 1', { exact: true }).fill('Bread');
    await page.getByRole('button', { name: 'Save and Close' }).click();

    await expect.element(page.getByText('Required').first()).toBeVisible();
    expect(useCashierShiftStore.getState().cashClose).toBeNull();
  });

  it('asks to check numbers when Cash on Hand is not the expected amount', async () => {
    await openStepThree();
    await page.getByLabelText('Total POS (Card Sales)').fill('10');
    await fillRest('1');
    await page.getByRole('button', { name: 'Save and Close' }).click();

    await expect
      .element(page.getByText(/check the numbers again/))
      .toBeVisible();
    expect(useCashierShiftStore.getState().cashClose).toBeNull();
  });

  it('alerts when Total POS differs from the credit totals', async () => {
    await openStepThree();
    await page.getByLabelText('Total POS (Card Sales)').fill('12');
    await expect.element(page.getByRole('alert')).toBeVisible();
  });

  it('totals payouts, saves cents and closes', async () => {
    let exited = false;
    await openStepThree(() => {
      exited = true;
    });
    await page.getByLabelText('Total POS (Card Sales)').fill('10');
    await page.getByLabelText('Payout 1', { exact: true }).fill('Bread');
    await page.getByLabelText('Payout 1 type').selectOptions('vendor');
    await page.getByLabelText('Payout 1 amount').fill('7.25');
    await expect
      .element(page.getByTestId('total-payouts'))
      .toHaveTextContent('7.25');
    await fillRest('57.75');
    await page.getByRole('button', { name: 'Save and Close' }).click();

    expect(useCashierShiftStore.getState().cashClose).toEqual({
      totalPosCents: 1000,
      posMismatch: false,
      payouts: [{ description: 'Bread', type: 'vendor', amountCents: 725 }],
      lottoWinnerCents: 500,
      giftCertificatesCents: 0,
      redemptionsCents: 0,
      safedropsCents: 2000,
      cashOnHandCents: 5775,
    });
    await vi.waitFor(() => expect(exited).toBe(true));

    expect(byPath('/credit-totals')).toMatchObject({
      shiftId: 9,
      userId: 4,
      creditTerminal: 10,
      creditTotal: 10,
    });
    expect(byPath('/daily-summary-reports')).toMatchObject({
      shiftId: 9,
      fuelSales: 60,
      totalSales: 100,
    });
    expect(byPath('/payouts')).toMatchObject({
      shiftId: 9,
      totalPos: 10,
      vendorPayout: 7.25,
      lottoPayout: 0,
      safedrops: 20,
      cashOnHand: 57.75,
    });
  });

  it('posts nothing until Save and Close is pressed', async () => {
    await openStepThree();
    expect(posted).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stays open on failure and retries only the table that failed', async () => {
    let exited = false;
    stubApi('/payouts');
    await openStepThree(() => {
      exited = true;
    });
    await page.getByLabelText('Total POS (Card Sales)').fill('10');
    await fillRest('65');
    await page.getByRole('button', { name: 'Save and Close' }).click();

    await expect.element(page.getByText('Database down')).toBeVisible();
    expect(exited).toBe(false);
    expect(posted.map((p) => p.url.split('/').pop()).sort()).toEqual([
      'credit-totals',
      'daily-summary-reports',
    ]);

    stubApi();
    await page.getByRole('button', { name: 'Save and Close' }).click();
    await vi.waitFor(() => expect(exited).toBe(true));
    expect(posted.map((p) => p.url.split('/').pop()).sort()).toEqual([
      'credit-totals',
      'daily-summary-reports',
      'payouts',
    ]);
  });
});
