import type { JSX } from 'react';
import { Navigate } from 'react-router';
import { login } from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/auth-store';
import { LoginScreen } from '@/features/auth/login-screen';
import { registerSession } from '@/lib/device-session';
import { ROUTES } from './constants';

export function LoginRoute(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);

  return user ? (
    <Navigate to={ROUTES.home} replace />
  ) : (
    <LoginScreen
      onSubmit={async (values) => {
        const { token, refreshToken, id } = await login(values);
        // The device sends queued writes under this session, even after sign-out.
        await registerSession({ userId: id, accessToken: token, refreshToken });
        signIn(token, id);
      }}
    />
  );
}
