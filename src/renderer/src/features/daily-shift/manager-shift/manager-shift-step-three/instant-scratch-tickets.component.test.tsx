import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useShiftStore } from '@/features/shift/shift-store';
import { resetShiftStore, seedOpenShift } from '@/features/shift/test-utils';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import { SCRATCH_DENOMINATIONS } from './constants';
import { stubManagerShiftApi } from '@/features/daily-shift/manager-shift/test-utils';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

async function openScratchStep(): Promise<void> {
  // Shift # is filled from, and locked to, the open shift.
  if (useShiftStore.getState().current.status !== 'open')
    seedOpenShift({ id: 2 });
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u3', role: 'MANAGER' })}.sig`;
  useAuthStore.getState().signIn(token, 3);
  await render(<DailyShiftScreen onExit={() => {}} />);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect.element(page.getByText('Step 3 of 5')).toBeVisible();
}

async function fillAllRows(close: string, activations: string): Promise<void> {
  for (const denomination of SCRATCH_DENOMINATIONS) {
    await page.getByLabelText(`$${denomination} close`).fill(close);
    await page.getByLabelText(`$${denomination} activations`).fill(activations);
  }
}

describe('Instant Scratch Tickets window (real browser)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetShiftStore();
    useAuthStore.getState().signOut();
    useManagerShiftStore.getState().reset();
    localStorage.clear();
  });

  it('requires the shift number and every count', async () => {
    stubManagerShiftApi();
    await openScratchStep();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect
      .element(page.getByText(/Enter a whole number/).first())
      .toBeVisible();
    await expect.element(page.getByText('Step 3 of 5')).toBeVisible();
    expect(useManagerShiftStore.getState().scratchTickets).toBeNull();
  });

  it('rejects a Close above Open + Activations', async () => {
    stubManagerShiftApi();
    await openScratchStep();
    await fillAllRows('0', '0');
    await page.getByLabelText('$5 close').fill('3');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect
      .element(page.getByText('Close cannot be more than Open + Activations'))
      .toBeVisible();
    await expect.element(page.getByText('Step 3 of 5')).toBeVisible();
  });

  it('calculates Sold and Amount, keeps the values and moves on', async () => {
    const fetchMock = stubManagerShiftApi();
    await openScratchStep();
    await fillAllRows('0', '0');
    // Open 10 + 5 activated - 3 left = 12 sold; 12 x $5 = $60.
    await page.getByLabelText('$5 open').fill('10');
    await page.getByLabelText('$5 activations').fill('5');
    await page.getByLabelText('$5 close').fill('3');

    await expect.element(page.getByTestId('sold-5')).toHaveTextContent('12');
    await expect
      .element(page.getByTestId('amount-5'))
      .toHaveTextContent('60.00');
    await expect
      .element(page.getByTestId('total-amount'))
      .toHaveTextContent('60.00');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 4 of 5')).toBeVisible();

    const saved = useManagerShiftStore.getState().scratchTickets;
    expect(saved?.shiftNumber).toBe(2);
    expect(saved?.totalAmountCents).toBe(6000);
    expect(saved?.rows.find((row) => row.denomination === 5)).toEqual({
      denomination: 5,
      openCount: 10,
      closeCount: 3,
      activationsCount: 5,
      soldCount: 12,
      amountCents: 6000,
    });
    // Nothing is posted until "Post and Close" on the last step.
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(false);
  });

  it('prefills the shift number with the current shift id', async () => {
    stubManagerShiftApi();
    seedOpenShift({ id: 9 });
    await openScratchStep();

    await expect.element(page.getByLabelText('Shift #')).toHaveValue('9');
    await expect.element(page.getByLabelText('Shift #')).toBeDisabled();

    await fillAllRows('0', '0');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 4 of 5')).toBeVisible();
    expect(useManagerShiftStore.getState().scratchTickets?.shiftNumber).toBe(9);
  });

  it('prefills Open from the previous report', async () => {
    stubManagerShiftApi({
      scratchLatest: Response.json({
        data: {
          id: 4,
          shiftNumber: 1,
          businessDate: '2026-11-13',
          totalAmountCents: 0,
          lines: [
            {
              denomination: 5,
              openCount: 10,
              closeCount: 7,
              activationsCount: 0,
              soldCount: 3,
              amountCents: 1500,
            },
          ],
        },
      }),
    });
    await openScratchStep();

    await expect.element(page.getByLabelText('$5 open')).toHaveValue('7');
    await expect.element(page.getByLabelText('$10 open')).toHaveValue('0');
  });
});
