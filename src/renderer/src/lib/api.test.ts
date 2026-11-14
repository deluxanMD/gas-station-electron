import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/auth-store';
import { apiRequest } from '@/lib/api';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

function signIn(): string {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u1', role: 'CASHIER' })}.sig`;
  useAuthStore.getState().signIn(token, 4);
  return token;
}

function stubFetch(response: Response): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(() => Promise.resolve(response));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().signOut();
    localStorage.clear();
  });

  it('sends the signed-in token as a bearer header', async () => {
    const token = signIn();
    const fetchMock = stubFetch(Response.json({ data: 1 }));

    await apiRequest('shifts');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/shifts$/),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
        }),
      }),
    );
  });

  it('sends no Authorization header when signed out', async () => {
    const fetchMock = stubFetch(Response.json({ data: 1 }));

    await apiRequest('shifts');

    const init = fetchMock.mock.calls[0][1] as { headers: object };
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('signs the user out when the API answers 401', async () => {
    signIn();
    stubFetch(
      Response.json({ message: 'Invalid or expired token' }, { status: 401 }),
    );

    await expect(apiRequest('shifts')).rejects.toThrow(
      'Invalid or expired token',
    );
    expect(useAuthStore.getState().token).toBeNull();
  });
});
