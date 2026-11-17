import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@/features/auth/constants';
import { signInOffline } from './offline-login';
import type { OfflineLoginResult } from '@/lib/ipc';

function device(result: OfflineLoginResult): void {
  window.api = {
    credentials: { loginOffline: vi.fn(() => Promise.resolve(result)) },
  } as unknown as Window['api'];
}

const values = { userId: 'cash1', password: 'secret123' };

describe('signInOffline', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'api');
  });

  it('signs in as the user the device remembers, with its role', async () => {
    device({
      status: 'ok',
      dbUserId: 7,
      role: 'CASHIER',
      token: 'old.token.value',
    });

    await expect(signInOffline(values)).resolves.toEqual({
      token: 'old.token.value',
      user: { userId: 'cash1', userRole: UserRole.Cashier },
      dbUserId: 7,
    });
  });

  it('gives no role when the remembered one is not a known role', async () => {
    device({ status: 'ok', dbUserId: 7, role: 'ALIEN', token: 't' });

    expect((await signInOffline(values))?.user.userRole).toBeNull();
  });

  it('tells a wrong password apart from a missing sign-in', async () => {
    device({ status: 'invalid' });
    await expect(signInOffline(values)).rejects.toThrow(
      'Incorrect user ID or password.',
    );

    device({ status: 'unavailable' });
    await expect(signInOffline(values)).rejects.toThrow(/no recent sign-in/);
  });

  it('says when to try again after too many wrong passwords', async () => {
    device({ status: 'locked', until: '2026-01-01T08:15:00.000Z' });

    await expect(signInOffline(values)).rejects.toThrow(
      /Too many wrong passwords/,
    );
  });

  it('returns null outside the desktop app', async () => {
    await expect(signInOffline(values)).resolves.toBeNull();
  });
});
