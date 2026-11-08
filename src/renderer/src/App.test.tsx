import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';

function mockLogin(ok: boolean): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      json: () =>
        Promise.resolve(
          ok
            ? { data: { userId: 'station1' } }
            : { message: 'Invalid user ID or password' },
        ),
    }),
  );
}

async function submitCredentials(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('User ID'), 'station1');
  await user.type(screen.getByLabelText('Password'), 'password123');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('App login flow', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the home screen after a successful login and signs out', async () => {
    mockLogin(true);
    render(<App />);
    await submitCredentials();

    expect(await screen.findByText('Welcome, station1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByLabelText('User ID')).toBeInTheDocument();
  });

  it('stays on login and shows the error when login fails', async () => {
    mockLogin(false);
    render(<App />);
    await submitCredentials();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid user ID or password',
      ),
    );
    expect(screen.queryByText(/Welcome,/)).not.toBeInTheDocument();
  });
});
