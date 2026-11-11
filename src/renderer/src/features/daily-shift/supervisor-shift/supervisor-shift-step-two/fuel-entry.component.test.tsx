import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { FUEL_GRADES } from './constants';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

async function openFuelStep(): Promise<void> {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u2', role: 'SUPERVISOR' })}.sig`;
  useAuthStore.getState().signIn(token);
  await render(<DailyShiftScreen onExit={() => {}} />);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect.element(page.getByText('Step 2 of 5')).toBeVisible();
}

// Five grades of 100.00 L each, so the grade volumes sum to 500.00.
async function fillGrades(): Promise<void> {
  for (const grade of FUEL_GRADES) {
    await page.getByLabelText(`${grade} volume`).fill('100');
    await page.getByLabelText(`${grade} total`).fill('150.25');
  }
}

describe('Fuel window (real browser)', () => {
  afterEach(() => {
    useAuthStore.getState().signOut();
    useSupervisorShiftStore.setState({ selectedShiftIds: [], fuel: null });
    localStorage.clear();
  });

  it('asks to recheck when Total Volume is not the sum of the grades', async () => {
    await openFuelStep();
    await fillGrades();
    await page.getByLabelText('Total volume').fill('499.99');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText(/Please recheck/)).toBeVisible();
    await expect.element(page.getByText('Step 2 of 5')).toBeVisible();
  });

  it('requires every grade volume and total', async () => {
    await openFuelStep();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText('Required').first()).toBeVisible();
    expect(useSupervisorShiftStore.getState().fuel).toBeNull();
  });

  it('saves the fuel entries and moves on', async () => {
    await openFuelStep();
    await fillGrades();
    await page.getByLabelText('Total volume').fill('500');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText('Step 3 of 5')).toBeVisible();
    expect(useSupervisorShiftStore.getState().fuel).toEqual({
      grades: FUEL_GRADES.map((grade) => ({
        grade,
        volumeCentiLitres: 10_000,
        totalCents: 15_025,
      })),
      totalVolumeCentiLitres: 50_000,
    });
  });
});
