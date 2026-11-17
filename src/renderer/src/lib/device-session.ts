import type { SessionInput } from '../../../shared/ipc';

// The preload API exists only inside the desktop app; elsewhere (tests, a plain browser) there is nothing to sync.
export async function registerSession(input: SessionInput): Promise<void> {
  await window.api?.session.set(input);
}

export async function releaseSession(userId: number): Promise<void> {
  await window.api?.session.release(userId);
}
