import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { resetShiftStore, seedOpenShift } from '@/features/shift/test-utils';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import { SCRATCH_DENOMINATIONS } from '@/features/daily-shift/manager-shift/manager-shift-step-three/constants';
import { stubScratchTicketApi } from '@/features/daily-shift/manager-shift/manager-shift-step-three/test-utils';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import { DIP_PRODUCTS } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-four/constants';
import { FUEL_GRADES } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-two/constants';
import { stubShiftApi } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-one/test-utils';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

function signInAs(role: string): void {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u1', role })}.sig`;
  useAuthStore.getState().signIn(token, 1);
  seedOpenShift();
}

describe('DailyShiftScreen (real browser)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetShiftStore();
    useManagerShiftStore.setState({
      scratchTickets: null,
      lottoReports: null,
      lottoReconciliation: null,
    });
    useSupervisorShiftStore.setState({
      selectedShiftIds: [],
      fuel: null,
      fuelDelivery: null,
      fuelDips: null,
    });
    useCashierShiftStore.setState({
      creditTotals: null,
      dailySummary: null,
      cashClose: null,
    });
    useAuthStore.getState().signOut();
    localStorage.clear();
  });

  it('walks a cashier through three steps with Next', async () => {
    signInAs('CASHIER');
    await render(<DailyShiftScreen onExit={() => {}} />);

    await expect.element(page.getByText('Step 1 of 3')).toBeVisible();
    for (const label of [
      'Credit Totals - Terminal',
      'Credit Totals - Host',
      'Debit - Terminal',
      'Fleet',
      'SV Redemption',
    ]) {
      await page.getByLabelText(label).fill('1.00');
    }
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 2 of 3')).toBeVisible();
    await page.getByLabelText('Day End Date').fill('2026-11-09');
    await page.getByLabelText('Day End Time (AM/PM)').fill('23:30');
    for (const label of ['Fuel Sales', 'Item Sales', 'GST', 'HST']) {
      await page.getByLabelText(label).fill('1.00');
    }
    await page.getByLabelText('Penny Rounding').fill('0');
    await page.getByLabelText('Total Sales').fill('4.00');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 3 of 3')).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Save and Close' }))
      .toBeVisible();
  });

  it('walks a supervisor through the five Close Day steps', async () => {
    const fetchMock = stubShiftApi();
    signInAs('SUPERVISOR');
    const onExit = vi.fn();
    await render(<DailyShiftScreen onExit={onExit} />);

    await page.getByLabelText(/cashier1/).click();
    await page.getByRole('button', { name: 'Review' }).click();
    for (let step = 1; step <= 5; step++) {
      await expect.element(page.getByText(`Step ${step} of 5`)).toBeVisible();
      if (step === 2) {
        for (const grade of FUEL_GRADES) {
          await page.getByLabelText(`${grade} volume`).fill('1');
          await page.getByLabelText(`${grade} total`).fill('1');
        }
        await page.getByLabelText('Total volume').fill('5');
      }
      if (step === 3) {
        await page.getByLabelText('Date').fill('2026-11-08');
        await page.getByLabelText('BOL #').fill('BOL-1');
        await page.getByLabelText('REG').fill('5');
        await page.getByLabelText('PREM').fill('0');
        await page.getByLabelText('DIESEL').fill('0');
        await page.getByLabelText('Total', { exact: true }).fill('5');
      }
      if (step === 4) {
        await page.getByLabelText('Date').fill('2026-11-09');
        await page.getByLabelText('Time').fill('22:15');
        for (const product of DIP_PRODUCTS) {
          await page.getByLabelText(`${product} TC volume`).fill('1');
          await page.getByLabelText(`${product} 90% ullage`).fill('1');
        }
      }
      if (step < 5) await page.getByRole('button', { name: 'Next' }).click();
    }
    const posted = (suffix: string): boolean =>
      fetchMock.mock.calls.some(([url]) => String(url).endsWith(suffix));
    // Next only navigates; nothing is saved before the last step.
    expect(posted('/fuel')).toBe(false);
    expect(posted('/fuel-deliveries')).toBe(false);
    expect(posted('/fuel-dips')).toBe(false);

    await page.getByRole('button', { name: 'Finish' }).click();
    await vi.waitFor(() => expect(onExit).toHaveBeenCalled());
    expect(posted('/fuel')).toBe(true);
    expect(posted('/fuel-deliveries')).toBe(true);
    expect(posted('/fuel-dips')).toBe(true);
    expect(posted('/shifts/9/close')).toBe(true);
  });

  it('keeps the shift open when saving on Finish fails', async () => {
    stubShiftApi({
      fuel: Response.json({ message: 'Server down' }, { status: 500 }),
    });
    signInAs('SUPERVISOR');
    useSupervisorShiftStore.setState({
      fuel: {
        grades: FUEL_GRADES.map((grade) => ({
          grade,
          volumeCentiLitres: 100,
          totalCents: 100,
        })),
        totalVolumeCentiLitres: 500,
      },
    });
    const onExit = vi.fn();
    await render(<DailyShiftScreen onExit={onExit} />);

    await page.getByLabelText(/cashier1/).click();
    await page.getByRole('button', { name: 'Review' }).click();
    for (let step = 1; step < 5; step++) {
      await expect.element(page.getByText(`Step ${step} of 5`)).toBeVisible();
      if (step === 2) {
        for (const grade of FUEL_GRADES) {
          await page.getByLabelText(`${grade} volume`).fill('1');
          await page.getByLabelText(`${grade} total`).fill('1');
        }
        await page.getByLabelText('Total volume').fill('5');
      }
      if (step === 4) {
        await page.getByLabelText('Date').fill('2026-11-09');
        await page.getByLabelText('Time').fill('22:15');
        for (const product of DIP_PRODUCTS) {
          await page.getByLabelText(`${product} TC volume`).fill('1');
          await page.getByLabelText(`${product} 90% ullage`).fill('1');
        }
      }
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Finish' }).click();

    await expect.element(page.getByRole('alert')).toBeVisible();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('walks a manager through the five steps', async () => {
    stubScratchTicketApi();
    seedOpenShift();
    signInAs('MANAGER');
    await render(<DailyShiftScreen onExit={() => {}} />);

    for (let step = 1; step <= 5; step++) {
      await expect.element(page.getByText(`Step ${step} of 5`)).toBeVisible();
      if (step === 5) {
        await page.getByLabelText('Bullock').fill('0');
        await page.getByLabelText('Bull-Payouts').fill('0');
        await page.getByLabelText('Bull-LottoWinner').fill('0');
      }
      if (step === 3) {
        for (const denomination of SCRATCH_DENOMINATIONS) {
          await page.getByLabelText(`$${denomination} close`).fill('0');
          await page.getByLabelText(`$${denomination} activations`).fill('0');
        }
      }
      if (step < 5) await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect
      .element(page.getByRole('button', { name: 'Post and Close' }))
      .toBeVisible();
  });

  it('has no flow for a role without one yet', async () => {
    signInAs('OWNER');
    await render(<DailyShiftScreen onExit={() => {}} />);

    await expect
      .element(page.getByText(/not available for your role yet/))
      .toBeVisible();
  });
});
