import type { JSX } from 'react';
import { Navigate } from 'react-router';
import { login } from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/auth-store';
import { LoginScreen } from '@/features/auth/login-screen';
import { ROUTES } from './constants';

export function LoginRoute(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);

  return user ? (
    <Navigate to={ROUTES.home} replace />
  ) : (
    <LoginScreen
      onSubmit={async (values) => {
        const { token, shiftId } = await login(values);
        signIn(token, shiftId);
      }}
    />
  );
}
