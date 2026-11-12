import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { Modal } from '@/components/modal';

function renderModal(
  props: Partial<Parameters<typeof Modal>[0]> = {},
): Pick<
  Parameters<typeof Modal>[0],
  'onApprove' | 'onCancel' | 'onOpenChange'
> {
  const handlers = {
    onApprove: vi.fn(),
    onCancel: vi.fn(),
    onOpenChange: vi.fn(),
  };
  void render(
    <Modal
      open
      title="Close shift?"
      description="This locks the shift and cannot be undone."
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('Modal (real browser)', () => {
  it('shows the title, description and both actions', async () => {
    renderModal();

    await expect
      .element(page.getByRole('dialog', { name: 'Close shift?' }))
      .toBeVisible();
    await expect
      .element(page.getByText('This locks the shift and cannot be undone.'))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Cancel' }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Approve' }))
      .toBeVisible();
  });

  it('calls onApprove when approved', async () => {
    const { onApprove } = renderModal();
    await page.getByRole('button', { name: 'Approve' }).click();

    expect(onApprove).toHaveBeenCalledOnce();
  });

  it('calls onCancel and closes when cancelled', async () => {
    const { onCancel, onOpenChange } = renderModal();
    await page.getByRole('button', { name: 'Cancel' }).click();

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('uses custom button labels', async () => {
    renderModal({ approveLabel: 'Close shift', cancelLabel: 'Keep open' });

    await expect
      .element(page.getByRole('button', { name: 'Close shift' }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Keep open' }))
      .toBeVisible();
  });

  it('disables both buttons while approving', async () => {
    renderModal({ isApproving: true });

    await expect
      .element(page.getByRole('button', { name: 'Cancel' }))
      .toBeDisabled();
    await expect
      .element(page.getByRole('button', { name: 'Approve' }))
      .toBeDisabled();
  });
});
