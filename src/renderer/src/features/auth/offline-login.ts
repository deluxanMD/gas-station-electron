import { UserRole } from '@/features/auth/constants';
import type { LoginValues } from '@/features/auth/login/types';
import type { AuthUser } from '@/features/auth/types';
import { loginOffline } from '@/lib/device-session';

export interface OfflineSignIn {
  token: string;
  user: AuthUser;
  dbUserId: number;
}

function isUserRole(value: string | null): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Checks the password on this device, for when the server cannot be reached. Throws with what the person should do
 * next; returns null outside the desktop app, where there is nothing to check against.
 */
export async function signInOffline(
  values: LoginValues,
): Promise<OfflineSignIn | null> {
  const result = await loginOffline(values);
  if (result === null) return null;

  switch (result.status) {
    case 'ok': {
      return {
        token: result.token,
        user: {
          userId: values.userId,
          userRole: isUserRole(result.role) ? result.role : null,
        },
        dbUserId: result.dbUserId,
      };
    }
    case 'invalid': {
      throw new Error('Incorrect user ID or password.');
    }
    case 'locked': {
      throw new Error(
        `Too many wrong passwords. Try again after ${formatTime(result.until)}.`,
      );
    }
    case 'unavailable': {
      throw new Error(
        'Unable to reach the server, and this device has no recent sign-in for you. Connect to the internet to sign in.',
      );
    }
  }
}
