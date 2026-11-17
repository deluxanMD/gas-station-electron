export const PROBE_PATH = 'health/live';
export const PROBE_TIMEOUT_MS = 5000;
// Checked often while offline so work resumes soon after the network returns; rarely while online.
export const PROBE_ONLINE_INTERVAL_MS = 30_000;
export const PROBE_OFFLINE_INTERVALS_MS = [
  5000, 10_000, 20_000, 30_000,
] as const;

export const REQUEST_TIMEOUT_MS = 15_000;
// A write that hits the server while it is struggling backs off 2s, 4s, 8s ... up to five minutes.
export const BACKOFF_BASE_MS = 2000;
export const BACKOFF_MAX_MS = 5 * 60_000;
export const BACKOFF_JITTER = 0.2;
// The engine also wakes on its own, so a retry that came due is never missed.
export const ENGINE_TICK_MS = 5000;

export const API_VERSION = 'v1';
export const SHIFT_START_ENTITY = 'shift-start';
export const SHIFT_ID_PLACEHOLDER = '{shiftId}';
// Server errors that mean "try again": the request may not have been handled at all.
export const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([408, 425, 429]);
export const ALREADY_SAVED_PATTERN = /already saved/i;
