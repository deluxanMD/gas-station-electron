import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { Connectivity } from './connectivity';
import type { FetchFn } from './types';

const reply = (status: number): Response => new Response(null, { status });

let fetchFn: Mock<FetchFn>;
let connectivity: Connectivity;

beforeEach(() => {
  vi.useFakeTimers();
  fetchFn = vi.fn<FetchFn>();
  connectivity = new Connectivity({
    probeUrl: 'http://api.test/health/live',
    fetch: fetchFn,
    onlineIntervalMs: 30_000,
    offlineIntervalsMs: [5000, 10_000],
  });
});

afterEach(() => {
  connectivity.stop();
  vi.useRealTimers();
});

describe('Connectivity', () => {
  it('starts offline and goes online when the server answers', async () => {
    fetchFn.mockResolvedValue(reply(200));
    const changes: string[] = [];
    connectivity.on('change', (state: string) => changes.push(state));

    expect(connectivity.state).toBe('offline');
    connectivity.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(connectivity.state).toBe('online');
    expect(changes).toEqual(['online']);
  });

  it('counts any answer below 500 as reachable', async () => {
    fetchFn.mockResolvedValue(reply(404));
    connectivity.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(connectivity.state).toBe('online');
  });

  it('treats a server error or a failed request as offline', async () => {
    fetchFn
      .mockResolvedValueOnce(reply(503))
      .mockRejectedValueOnce(new Error('down'));
    connectivity.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(connectivity.state).toBe('offline');

    await vi.advanceTimersByTimeAsync(5000);
    expect(connectivity.state).toBe('offline');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('probes more slowly the longer it stays offline, then quickly recovers', async () => {
    fetchFn.mockRejectedValue(new Error('down'));
    connectivity.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    // The second wait is 10 s, so nothing happens after 5 s more.
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(3);

    fetchFn.mockResolvedValue(reply(200));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(connectivity.state).toBe('online');
    await vi.advanceTimersByTimeAsync(29_000);
    expect(fetchFn).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchFn).toHaveBeenCalledTimes(5);
  });

  it('checks right away when a request reports a failure', async () => {
    fetchFn
      .mockResolvedValueOnce(reply(200))
      .mockRejectedValueOnce(new Error('down'));
    connectivity.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(connectivity.state).toBe('online');

    connectivity.reportFailure();
    await vi.advanceTimersByTimeAsync(0);

    expect(connectivity.state).toBe('offline');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('stops probing once stopped', async () => {
    fetchFn.mockResolvedValue(reply(200));
    connectivity.start();
    await vi.advanceTimersByTimeAsync(0);
    connectivity.stop();

    await vi.advanceTimersByTimeAsync(120_000);

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
