import { useAuthStore } from '@/features/auth/auth-store';
import { AuthScheme } from '@/features/auth/constants';
import { renewSession } from '@/lib/device-session';

const API_VERSION = 'v1';

// Carries the HTTP status so callers can react to a specific one (e.g. 409).
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// The server could not be reached at all (as opposed to answering with an error).
export class OfflineError extends Error {
  constructor(message = 'Unable to reach the server. Please try again.') {
    super(message);
  }
}

// One renewal at a time: requests that fail together share the answer instead of each spending the refresh token.
let renewing: Promise<string | null> | null = null;

function renewToken(): Promise<string | null> {
  const { dbUserId } = useAuthStore.getState();
  if (dbUserId === null) return Promise.resolve(null);
  renewing ??= renewSession(dbUserId)
    .then((token) => {
      if (token) useAuthStore.setState({ token });
      return token;
    })
    .catch(() => null)
    .finally(() => {
      renewing = null;
    });
  return renewing;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  fallbackMessage = 'Request failed. Please try again.',
  retried = false,
): Promise<T> {
  const { token } = useAuthStore.getState();
  let response: Response;
  try {
    response = await fetch(
      `${import.meta.env.RENDERER_VITE_API_BASE_URL}/${API_VERSION}/${path}`,
      {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `${AuthScheme.Bearer} ${token}` } : {}),
        },
      },
    );
  } catch {
    throw new OfflineError();
  }
  if (!response.ok) {
    if (response.status === 401) {
      // An expired access token is renewed with the device's refresh token; only a refused renewal signs out.
      if (!retried && (await renewToken())) {
        return apiRequest<T>(path, init, fallbackMessage, true);
      }
      useAuthStore.getState().signOut();
    }
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new ApiError(body.message ?? fallbackMessage, response.status);
  }
  return (await response.json()) as T;
}
