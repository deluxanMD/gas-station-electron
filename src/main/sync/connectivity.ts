import { EventEmitter } from 'node:events';
import type { ConnectivityState } from '../../shared/ipc';
import {
  PROBE_OFFLINE_INTERVALS_MS,
  PROBE_ONLINE_INTERVAL_MS,
  PROBE_TIMEOUT_MS,
} from './constants';
import type { ConnectivityOptions } from './types';

/**
 * Knows whether the API can actually be reached. `navigator.onLine` only says a network interface is up, so this asks
 * the server. Starts offline until the first probe answers.
 */
export class Connectivity extends EventEmitter {
  private current: ConnectivityState = 'offline';
  private timer: NodeJS.Timeout | null = null;
  private offlineProbes = 0;
  private running = false;

  constructor(private readonly options: ConnectivityOptions) {
    super();
  }

  get state(): ConnectivityState {
    return this.current;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.probe();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** A request just failed to reach the server: check right away instead of waiting for the next probe. */
  reportFailure(): void {
    if (!this.running) return;
    this.set('offline');
    void this.probe();
  }

  /** Any answer from the server means it is reachable, even an error: the engine handles what the answer says. */
  async probe(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    let reachable: boolean;
    try {
      const response = await this.options.fetch(this.options.probeUrl, {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      reachable = response.status < 500;
    } catch {
      reachable = false;
    }
    if (!this.running) return;

    this.set(reachable ? 'online' : 'offline');
    this.offlineProbes = reachable ? 0 : this.offlineProbes + 1;
    this.timer = setTimeout(() => void this.probe(), this.nextDelay(reachable));
    this.timer.unref();
  }

  private nextDelay(reachable: boolean): number {
    if (reachable)
      return this.options.onlineIntervalMs ?? PROBE_ONLINE_INTERVAL_MS;
    const steps = this.options.offlineIntervalsMs ?? PROBE_OFFLINE_INTERVALS_MS;
    return steps[Math.min(this.offlineProbes - 1, steps.length - 1)];
  }

  private set(state: ConnectivityState): void {
    if (state === this.current) return;
    this.current = state;
    this.emit('change', state);
  }
}
