export const SALT_LENGTH = 16;
export const KEY_LENGTH = 32;
// Slow on purpose (about 100 ms): it is what stands between a copied database and the password.
export const SCRYPT_COST = {
  N: 2 ** 15,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MS = 15 * 60_000;
// How long after the last online sign-in the device still accepts it: the lifetime of a refresh token.
export const MAX_OFFLINE_DAYS = 30;
