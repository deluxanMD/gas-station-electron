import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/auth-store';
import { apiRequest, OfflineError } from '@/lib/api';

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

const unauthorized = (): Response =>
  Response.json({ message: 'Invalid or expired token' }, { status: 401 });

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

  it('reports an unreachable server as offline, not as an API error', async () => {
    signIn();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
    );

    await expect(apiRequest('shifts')).rejects.toBeInstanceOf(OfflineError);
    expect(useAuthStore.getState().token).not.toBeNull();
  });

  describe('when the access token has expired', () => {
    afterEach(() => {
      Reflect.deleteProperty(window, 'api');
    });

    it('renews it with the device, tries again once and stays signed in', async () => {
      signIn();
      const renew = vi.fn(() => Promise.resolve('fresh.token.value'));
      window.api = { session: { renew } } as unknown as Window['api'];
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(Response.json({ data: 1 }));
      vi.stubGlobal('fetch', fetchMock);

      await expect(apiRequest('shifts')).resolves.toEqual({ data: 1 });

      expect(renew).toHaveBeenCalledWith(4);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][1]).toMatchObject({
        headers: { Authorization: 'Bearer fresh.token.value' },
      });
      expect(useAuthStore.getState().token).toBe('fresh.token.value');
    });

    it('signs out when the device cannot renew it', async () => {
      signIn();
      window.api = {
        session: { renew: vi.fn(() => Promise.resolve(null)) },
      } as unknown as Window['api'];
      const fetchMock = vi.fn(() => Promise.resolve(unauthorized()));
      vi.stubGlobal('fetch', fetchMock);

      await expect(apiRequest('shifts')).rejects.toThrow(
        'Invalid or expired token',
      );

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('gives up after one retry instead of looping', async () => {
      signIn();
      window.api = {
        session: { renew: vi.fn(() => Promise.resolve('fresh.token.value')) },
      } as unknown as Window['api'];
      const fetchMock = vi.fn(() => Promise.resolve(unauthorized()));
      vi.stubGlobal('fetch', fetchMock);

      await expect(apiRequest('shifts')).rejects.toThrow(
        'Invalid or expired token',
      );

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('renews once for requests that fail together', async () => {
      signIn();
      const renew = vi.fn(
        () =>
          new Promise<string>((resolve) =>
            setTimeout(() => resolve('fresh.token.value'), 10),
          ),
      );
      window.api = { session: { renew } } as unknown as Window['api'];
      vi.stubGlobal(
        'fetch',
        vi.fn((_url: string, init: { headers: Record<string, string> }) =>
          Promise.resolve(
            init.headers.Authorization === 'Bearer fresh.token.value'
              ? Response.json({ data: 1 })
              : unauthorized(),
          ),
        ),
      );

      await Promise.all([apiRequest('a'), apiRequest('b'), apiRequest('c')]);

      expect(renew).toHaveBeenCalledTimes(1);
    });
  });
});
