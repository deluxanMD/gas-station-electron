import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { LoginForm } from '@/features/auth/login';

async function fillAndSubmit(password: string): Promise<void> {
  await page.getByLabelText('User ID').fill('station1');
  await page.getByLabelText('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

describe('LoginForm (real browser)', () => {
  it('submits the entered credentials', async () => {
    const onSubmit = vi.fn();
    await render(<LoginForm onSubmit={onSubmit} />);
    await fillAndSubmit('password123');

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        userId: 'station1',
        password: 'password123',
      }),
    );
  });

  it('shows validation messages and does not submit invalid input', async () => {
    const onSubmit = vi.fn();
    await render(<LoginForm onSubmit={onSubmit} />);
    await fillAndSubmit('short');

    await expect
      .element(page.getByText('Password must be at least 8 characters'))
      .toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the error when onSubmit rejects', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error('Invalid user ID or password'));
    await render(<LoginForm onSubmit={onSubmit} />);
    await fillAndSubmit('password123');

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Invalid user ID or password');
  });
});
