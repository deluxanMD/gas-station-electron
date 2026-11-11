import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import { SCRATCH_DENOMINATIONS } from './constants';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

async function openScratchStep(): Promise<void> {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u3', role: 'MANAGER' })}.sig`;
  useAuthStore.getState().signIn(token);
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
    useAuthStore.getState().signOut();
    useManagerShiftStore.setState({ scratchTickets: null });
    localStorage.clear();
  });

  it('requires the shift number and every count', async () => {
    await openScratchStep();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect
      .element(page.getByText(/Enter a whole number/).first())
      .toBeVisible();
    await expect.element(page.getByText('Step 3 of 5')).toBeVisible();
    expect(useManagerShiftStore.getState().scratchTickets).toBeNull();
  });

  it('rejects a Close above Open + Activations', async () => {
    await openScratchStep();
    await page.getByLabelText('Shift #').fill('1');
    await fillAllRows('0', '0');
    await page.getByLabelText('$5 close').fill('3');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect
      .element(page.getByText('Close cannot be more than Open + Activations'))
      .toBeVisible();
    await expect.element(page.getByText('Step 3 of 5')).toBeVisible();
  });

  it('calculates Sold and Amount, saves and moves on', async () => {
    await openScratchStep();
    await page.getByLabelText('Shift #').fill('2');
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
  });
});
