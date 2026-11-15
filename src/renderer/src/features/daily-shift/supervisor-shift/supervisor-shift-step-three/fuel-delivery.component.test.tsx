import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { resetShiftStore, seedOpenShift } from '@/features/shift/test-utils';
import { stubShiftApi } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-one/test-utils';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { FUEL_GRADES } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-two/constants';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

async function openDeliveryStep(): Promise<ReturnType<typeof vi.fn>> {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u2', role: 'SUPERVISOR' })}.sig`;
  useAuthStore.getState().signIn(token);
  const fetchMock = stubShiftApi();
  seedOpenShift();
  await render(<DailyShiftScreen onExit={() => {}} />);
  await page.getByRole('button', { name: 'Next' }).click();
  for (const grade of FUEL_GRADES) {
    await page.getByLabelText(`${grade} volume`).fill('1');
    await page.getByLabelText(`${grade} total`).fill('1');
  }
  await page.getByLabelText('Total volume').fill('5');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect.element(page.getByText('Step 3 of 5')).toBeVisible();
  return fetchMock;
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
    vi.unstubAllGlobals();
    resetShiftStore();
    useAuthStore.getState().signOut();
    useSupervisorShiftStore.setState({
      selectedShiftIds: [],
      fuel: null,
      fuelDelivery: null,
    });
    localStorage.clear();
  });

  it('lets the supervisor skip the delivery with Next', async () => {
    const fetchMock = await openDeliveryStep();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 4 of 5')).toBeVisible();
    expect(useSupervisorShiftStore.getState().fuelDelivery).toBeNull();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).endsWith('/fuel-deliveries'),
      ),
    ).toBe(false);
  });

  it('has no Add Fuel Delivery button', async () => {
    await openDeliveryStep();
    await expect
      .element(page.getByRole('button', { name: 'Add Fuel Delivery' }))
      .not.toBeInTheDocument();
  });

  it('asks to recheck when the total is not the sum of the grades', async () => {
    await openDeliveryStep();
    await fillDelivery('10000');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText(/Please recheck/)).toBeVisible();
    await expect.element(page.getByText('Step 3 of 5')).toBeVisible();
    expect(useSupervisorShiftStore.getState().fuelDelivery).toBeNull();
  });

  it('keeps the delivery for the final save; Next only moves on', async () => {
    const fetchMock = await openDeliveryStep();
    await fillDelivery('10000.50');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText('Step 4 of 5')).toBeVisible();
    expect(useSupervisorShiftStore.getState().fuelDelivery).toEqual({
      date: '2026-11-08',
      bolNumber: 'BOL-1001',
      regCentiLitres: 500_000,
      premCentiLitres: 200_050,
      dieselCentiLitres: 300_000,
      totalCentiLitres: 1_000_050,
    });
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).endsWith('/fuel-deliveries'),
      ),
    ).toBe(false);
  });
});
