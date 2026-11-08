import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/auth-store';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

function makeToken(payload: object): string {
  return `${encodePart({ alg: 'HS256' })}.${encodePart(payload)}.signature`;
}

describe('useAuthStore', () => {
  beforeEach(() => useAuthStore.getState().signOut());

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
});
