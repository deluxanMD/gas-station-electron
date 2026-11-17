import type { StateStorage } from 'zustand/middleware';

// Drafts are saved under the signed-in user and the shift they belong to; with no scope nothing is read or written,
// so one person's half-entered figures can never show up for another.
let scope: string | null = null;

export function setDraftScope(next: string | null): void {
  scope = next;
}

export function currentDraftScope(): string | null {
  return scope;
}

function slot(name: string): string | null {
  return scope === null ? null : `${name}|${scope}`;
}

// Storage can be unavailable or full; a draft is a convenience, so failing to keep one never breaks entering data.
function attempt<T>(action: () => T, fallback: T): T {
  try {
    return action();
  } catch {
    return fallback;
  }
}

export const draftStorage: StateStorage = {
  getItem: (name) => {
    const key = slot(name);
    return key === null ? null : attempt(() => localStorage.getItem(key), null);
  },
  setItem: (name, value) => {
    const key = slot(name);
    if (key !== null)
      attempt(() => localStorage.setItem(key, value), undefined);
  },
  removeItem: (name) => {
    const key = slot(name);
    if (key !== null) attempt(() => localStorage.removeItem(key), undefined);
  },
};
