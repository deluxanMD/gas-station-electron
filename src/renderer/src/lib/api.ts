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

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  fallbackMessage = 'Request failed. Please try again.',
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      `${import.meta.env.RENDERER_VITE_API_BASE_URL}/${API_VERSION}/${path}`,
      { ...init, headers: { 'Content-Type': 'application/json' } },
    );
  } catch {
    throw new Error('Unable to reach the server. Please try again.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new ApiError(body.message ?? fallbackMessage, response.status);
  }
  return (await response.json()) as T;
}
