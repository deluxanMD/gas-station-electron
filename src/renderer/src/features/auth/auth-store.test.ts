import { beforeEach, describe, expect, it } from 'vitest';
import { AUTH_STORAGE_KEY, useAuthStore } from '@/features/auth/auth-store';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

function makeToken(payload: object): string {
  return `${encodePart({ alg: 'HS256' })}.${encodePart(payload)}.signature`;
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().signOut();
    localStorage.clear();
  });

  it('stores the token and the user decoded from it on sign in', () => {
    const token = makeToken({ sub: 'alice', role: 'MANAGER' });

    useAuthStore.getState().signIn(token);

    expect(useAuthStore.getState()).toMatchObject({
      token,
      user: { userId: 'alice', userRole: 'MANAGER' },
    });
  });

  it('stays signed out when the token cannot be decoded', () => {
    useAuthStore.getState().signIn('not-a-jwt');

    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
  });

  it('clears the token and user on sign out', () => {
    useAuthStore
      .getState()
      .signIn(makeToken({ sub: 'alice', role: 'MANAGER' }));

    useAuthStore.getState().signOut();

    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
  });

  it('persists only the token and user id', () => {
    useAuthStore
      .getState()
      .signIn(makeToken({ sub: 'alice', role: 'MANAGER' }), 7);

    const saved = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? '{}');

    expect(Object.keys(saved.state)).toEqual(['token', 'dbUserId']);
  });

  it('restores the token and decodes the user on load', async () => {
    const token = makeToken({ sub: 'alice', role: 'MANAGER' });
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ state: { token, dbUserId: 7 }, version: 0 }),
    );

    await useAuthStore.persist.rehydrate();

    expect(useAuthStore.getState()).toMatchObject({
      token,
      dbUserId: 7,
      user: { userId: 'alice', userRole: 'MANAGER' },
    });
  });

  it('drops a saved session that has no user id, so the user signs in again', async () => {
    const token = makeToken({ sub: 'alice', role: 'MANAGER' });
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ state: { token }, version: 0 }),
    );

    await useAuthStore.persist.rehydrate();

    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
  });

  it('ignores a saved token that is expired or malformed', async () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        state: { token: makeToken({ sub: 'alice', exp: 1 }) },
        version: 0,
      }),
    );

    await useAuthStore.persist.rehydrate();

    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
  });

  it('removes the saved token on sign out', () => {
    useAuthStore
      .getState()
      .signIn(makeToken({ sub: 'alice', role: 'MANAGER' }));

    useAuthStore.getState().signOut();

    const saved = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? '{}');
    expect(saved.state.token).toBeNull();
  });
});
