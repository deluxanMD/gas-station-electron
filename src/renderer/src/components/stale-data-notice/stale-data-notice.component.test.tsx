import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useStaleStore } from '@/lib/stale-store';
import { StaleDataNotice } from '.';

describe('StaleDataNotice (real browser)', () => {
  afterEach(() => {
    useStaleStore.setState({ stale: {} });
  });

  it('shows nothing while everything on screen is current', async () => {
    await render(<StaleDataNotice />);

    await expect.element(page.getByRole('note')).not.toBeInTheDocument();
  });

  it('says the screen shows a saved copy', async () => {
    useStaleStore.setState({
      stale: { '4|shifts': new Date(2026, 0, 1, 14, 2).toISOString() },
    });
    await render(<StaleDataNotice />);

    await expect.element(page.getByRole('note')).toBeVisible();
    await expect
      .element(
        page.getByText(/Unable to reach the server.*saved on this device/),
      )
      .toBeVisible();
  });

  it('says when only this device’s shifts are shown', async () => {
    useStaleStore.setState({
      stale: { 'this-device-only': new Date().toISOString() },
    });
    await render(<StaleDataNotice />);

    await expect
      .element(page.getByText(/only shifts made on this device/))
      .toBeVisible();
    await expect
      .element(page.getByText(/last saved on this device/))
      .not.toBeInTheDocument();
  });
});
