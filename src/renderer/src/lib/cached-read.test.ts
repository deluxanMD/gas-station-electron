import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/auth-store';
import { ApiError, OfflineError } from '@/lib/api';
import { cachedRead } from './cached-read';
import { useStaleStore } from './stale-store';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

let get: ReturnType<typeof vi.fn>;
let put: ReturnType<typeof vi.fn>;

beforeEach(() => {
  get = vi.fn(() => Promise.resolve(null));
  put = vi.fn(() => Promise.resolve());
  window.api = { cache: { get, put } } as unknown as Window['api'];
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u1', role: 'MANAGER' })}.sig`;
  useAuthStore.getState().signIn(token, 4);
});

afterEach(() => {
  Reflect.deleteProperty(window, 'api');
  useAuthStore.getState().signOut();
  useStaleStore.setState({ stale: {} });
  localStorage.clear();
});

describe('cachedRead', () => {
  it('returns the server answer and keeps it for this user', async () => {
    await expect(
      cachedRead('shifts', () => Promise.resolve([1, 2])),
    ).resolves.toEqual([1, 2]);

    expect(put).toHaveBeenCalledWith('4|shifts', [1, 2]);
    expect(useStaleStore.getState().stale).toEqual({});
  });

  it('falls back to the saved answer when the server cannot be reached, and says so', async () => {
    get.mockResolvedValue({
      value: [9],
      fetchedAt: '2026-01-01T08:00:00.000Z',
    });

    const data = await cachedRead('shifts', () =>
      Promise.reject(new OfflineError()),
    );

    expect(data).toEqual([9]);
    expect(get).toHaveBeenCalledWith('4|shifts');
    expect(useStaleStore.getState().stale).toEqual({
      '4|shifts': '2026-01-01T08:00:00.000Z',
    });
  });

  it('serves a saved "nothing yet" (null) like any other answer', async () => {
    get.mockResolvedValue({
      value: null,
      fetchedAt: '2026-01-01T08:00:00.000Z',
    });

    await expect(
      cachedRead('latest', () => Promise.reject(new OfflineError())),
    ).resolves.toBeNull();
  });

  it('clears the notice once a fresh answer arrives', async () => {
    get.mockResolvedValue({
      value: [9],
      fetchedAt: '2026-01-01T08:00:00.000Z',
    });
    await cachedRead('shifts', () => Promise.reject(new OfflineError()));

    await cachedRead('shifts', () => Promise.resolve([1]));

    expect(useStaleStore.getState().stale).toEqual({});
  });

  it('throws the original error when nothing is saved', async () => {
    const offline = new OfflineError();

    await expect(
      cachedRead('shifts', () => Promise.reject(offline)),
    ).rejects.toBe(offline);
    expect(useStaleStore.getState().stale).toEqual({});
  });

  it('never replaces a server error with a saved answer', async () => {
    get.mockResolvedValue({
      value: [9],
      fetchedAt: '2026-01-01T08:00:00.000Z',
    });
    const refused = new ApiError('Database down', 500);

    await expect(
      cachedRead('shifts', () => Promise.reject(refused)),
    ).rejects.toBe(refused);
    expect(get).not.toHaveBeenCalled();
  });

  it('does not fail a read because the answer could not be kept', async () => {
    put.mockRejectedValue(new Error('disk full'));

    await expect(
      cachedRead('shifts', () => Promise.resolve([1])),
    ).resolves.toEqual([1]);
  });

  it('works outside the desktop app', async () => {
    Reflect.deleteProperty(window, 'api');

    await expect(
      cachedRead('shifts', () => Promise.resolve([1])),
    ).resolves.toEqual([1]);
    const offline = new OfflineError();
    await expect(
      cachedRead('shifts', () => Promise.reject(offline)),
    ).rejects.toBe(offline);
  });

  it('keeps users apart', async () => {
    await cachedRead('shifts', () => Promise.resolve([1]));
    useAuthStore.getState().signOut();
    const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u2', role: 'MANAGER' })}.sig`;
    useAuthStore.getState().signIn(token, 5);

    await cachedRead('shifts', () => Promise.resolve([2]));

    expect(put.mock.calls.map(([key]) => key)).toEqual([
      '4|shifts',
      '5|shifts',
    ]);
  });
});
