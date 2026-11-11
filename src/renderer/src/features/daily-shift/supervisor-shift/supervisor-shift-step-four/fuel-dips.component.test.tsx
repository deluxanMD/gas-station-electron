import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { FUEL_GRADES } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-two/constants';
import { DIP_PRODUCTS } from './constants';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

async function openDipsStep(): Promise<void> {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u2', role: 'SUPERVISOR' })}.sig`;
  useAuthStore.getState().signIn(token);
  await render(<DailyShiftScreen onExit={() => {}} />);
  await page.getByRole('button', { name: 'Next' }).click();
  for (const grade of FUEL_GRADES) {
    await page.getByLabelText(`${grade} volume`).fill('1');
    await page.getByLabelText(`${grade} total`).fill('1');
  }
  await page.getByLabelText('Total volume').fill('5');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect.element(page.getByText('Step 4 of 5')).toBeVisible();
}

describe('Add Fuel Dips window (real browser)', () => {
  afterEach(() => {
    useAuthStore.getState().signOut();
    useSupervisorShiftStore.setState({
      selectedShiftIds: [],
      fuel: null,
      fuelDeliveries: [],
      fuelDips: null,
    });
    localStorage.clear();
  });

  it('requires the date, time and every volume', async () => {
    await openDipsStep();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText('Required').first()).toBeVisible();
    await expect.element(page.getByText('Step 4 of 5')).toBeVisible();
    expect(useSupervisorShiftStore.getState().fuelDips).toBeNull();
  });

  it('saves the dips and moves on', async () => {
    await openDipsStep();
    await page.getByLabelText('Date').fill('2026-11-09');
    await page.getByLabelText('Time').fill('22:15');
    for (const product of DIP_PRODUCTS) {
      await page.getByLabelText(`${product} TC volume`).fill('10000.5');
      await page.getByLabelText(`${product} 90% ullage`).fill('2500');
    }
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText('Step 5 of 5')).toBeVisible();
    expect(useSupervisorShiftStore.getState().fuelDips).toEqual({
      date: '2026-11-09',
      time: '22:15',
      products: DIP_PRODUCTS.map((product) => ({
        product,
        tcVolumeCentiLitres: 1_000_050,
        ullage90CentiLitres: 250_000,
      })),
    });
  });
});
