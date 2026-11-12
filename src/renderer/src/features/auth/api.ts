import type {
  ErrorResponse,
  LoginResponse,
  LoginResult,
} from '@/features/auth/types';
import type { LoginValues } from '@/features/auth/login/types';

const API_VERSION = 'v1';

export async function login(values: LoginValues): Promise<LoginResult> {
  let response: Response;
  try {
    response = await fetch(
      `${import.meta.env.RENDERER_VITE_API_BASE_URL}/${API_VERSION}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      },
    );
  } catch {
    throw new Error('Unable to reach the server. Please try again.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new Error(body.message ?? 'Sign in failed. Please try again.');
  }

  const { token, shiftId } = ((await response.json()) as LoginResponse).data;
  return { token, shiftId };
}
