import { describe, expect, it } from 'vitest';
import { decodeToken } from '@/features/auth/decode-token';

function encodePart(value: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCodePoint(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function makeToken(payload: object): string {
  return `${encodePart({ alg: 'HS256' })}.${encodePart(payload)}.signature`;
}

const inFuture = Math.floor(Date.now() / 1000) + 3600;

describe('decodeToken', () => {
  it('returns the user id and role from a valid token', () => {
    const token = makeToken({ sub: 'alice', role: 'MANAGER', exp: inFuture });

    expect(decodeToken(token)).toEqual({
      userId: 'alice',
      userRole: 'MANAGER',
    });
  });

  it('returns a null role when the claim is missing or unknown', () => {
    expect(decodeToken(makeToken({ sub: 'alice', role: null }))).toEqual({
      userId: 'alice',
      userRole: null,
    });
    expect(decodeToken(makeToken({ sub: 'alice', role: 'ADMIN' }))).toEqual({
      userId: 'alice',
      userRole: null,
    });
  });

  it('decodes non-ASCII user ids', () => {
    const token = makeToken({ sub: 'zoë', role: 'CASHIER' });

    expect(decodeToken(token)?.userId).toBe('zoë');
  });

  it('returns null for an expired token', () => {
    const token = makeToken({ sub: 'alice', role: 'MANAGER', exp: 1 });

    expect(decodeToken(token)).toBeNull();
  });

  it('returns null for a malformed token', () => {
    expect(decodeToken('')).toBeNull();
    expect(decodeToken('not-a-jwt')).toBeNull();
    expect(decodeToken('a.%%%.c')).toBeNull();
    expect(decodeToken(`a.${btoa('not json')}.c`)).toBeNull();
  });

  it('returns null when the subject is missing', () => {
    expect(decodeToken(makeToken({ role: 'MANAGER' }))).toBeNull();
  });
});
