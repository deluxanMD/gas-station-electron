import type {
  OfflineLoginInput,
  OfflineLoginResult,
  RememberCredentialsInput,
  SessionInput,
} from '@/lib/ipc';

// The preload API exists only inside the desktop app; elsewhere (tests, a plain browser) there is nothing to sync.
export async function registerSession(input: SessionInput): Promise<void> {
  await window.api?.session.set(input);
}

export async function releaseSession(userId: number): Promise<void> {
  await window.api?.session.release(userId);
}

// A new access token from the device's refresh token, or null.
export async function renewSession(userId: number): Promise<string | null> {
  return (await window.api?.session.renew(userId)) ?? null;
}

// Lets this person sign in again on this device with no server.
export async function rememberCredentials(
  input: RememberCredentialsInput,
): Promise<void> {
  await window.api?.credentials.remember(input);
}

// Null outside the desktop app, where there is nothing to check a password against.
export async function loginOffline(
  input: OfflineLoginInput,
): Promise<OfflineLoginResult | null> {
  return (await window.api?.credentials.loginOffline(input)) ?? null;
}
