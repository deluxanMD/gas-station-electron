import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { FUEL_GRADES } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-two/constants';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

async function openDeliveryStep(): Promise<void> {
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
  await expect.element(page.getByText('Step 3 of 5')).toBeVisible();
}

async function fillDelivery(total: string): Promise<void> {
  await page.getByLabelText('Date').fill('2026-11-08');
  await page.getByLabelText('BOL #').fill('BOL-1001');
  await page.getByLabelText('REG').fill('5000');
  await page.getByLabelText('PREM').fill('2000.50');
  await page.getByLabelText('DIESEL').fill('3000');
  await page.getByLabelText('Total', { exact: true }).fill(total);
}

describe('Fuel Delivery window (real browser)', () => {
  afterEach(() => {
    useAuthStore.getState().signOut();
    useSupervisorShiftStore.setState({
      selectedShiftIds: [],
      fuel: null,
      fuelDeliveries: [],
    });
    localStorage.clear();
  });

  it('lets the supervisor skip deliveries with Next', async () => {
    await openDeliveryStep();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 4 of 5')).toBeVisible();
    expect(useSupervisorShiftStore.getState().fuelDeliveries).toEqual([]);
  });

  it('asks to recheck when the total is not the sum of the grades', async () => {
    await openDeliveryStep();
    await fillDelivery('10000');
    await page.getByRole('button', { name: 'Add Fuel Delivery' }).click();

    await expect.element(page.getByText(/Please recheck/)).toBeVisible();
    expect(useSupervisorShiftStore.getState().fuelDeliveries).toEqual([]);
  });

  it('adds and removes deliveries', async () => {
    await openDeliveryStep();
    await fillDelivery('10000.50');
    await page.getByRole('button', { name: 'Add Fuel Delivery' }).click();

    await expect.element(page.getByText(/BOL-1001/)).toBeVisible();
    expect(useSupervisorShiftStore.getState().fuelDeliveries).toMatchObject([
      {
        date: '2026-11-08',
        bolNumber: 'BOL-1001',
        regCentiLitres: 500_000,
        premCentiLitres: 200_050,
        dieselCentiLitres: 300_000,
        totalCentiLitres: 1_000_050,
      },
    ]);
    await expect.element(page.getByLabelText('BOL #')).toHaveValue('');

    await page.getByRole('button', { name: 'Remove' }).click();
    expect(useSupervisorShiftStore.getState().fuelDeliveries).toEqual([]);
  });

  it('does not silently drop a started delivery on Next', async () => {
    await openDeliveryStep();
    await page.getByLabelText('BOL #').fill('BOL-2');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect
      .element(page.getByText(/Click Add Fuel Delivery/))
      .toBeVisible();
    await expect.element(page.getByText('Step 3 of 5')).toBeVisible();
  });
});
