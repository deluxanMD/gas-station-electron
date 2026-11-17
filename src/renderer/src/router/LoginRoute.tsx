import type { JSX } from 'react';
import { Navigate } from 'react-router';
import { login } from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/auth-store';
import { LoginScreen } from '@/features/auth/login-screen';
import { signInOffline } from '@/features/auth/offline-login';
import { decodeToken } from '@/features/auth/decode-token';
import { OfflineError } from '@/lib/api';
import { rememberCredentials, registerSession } from '@/lib/device-session';
import { ROUTES } from './constants';

export function LoginRoute(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const signInAs = useAuthStore((s) => s.signInAs);

  return user ? (
    <Navigate to={ROUTES.home} replace />
  ) : (
    <LoginScreen
      onSubmit={async (values) => {
        try {
          const { token, refreshToken, id } = await login(values);
          // The device sends queued writes under this session, even after sign-out.
          await registerSession({
            userId: id,
            accessToken: token,
            refreshToken,
          });
          // So the same person can sign in again here when the server cannot be reached.
          await rememberCredentials({
            userId: values.userId,
            dbUserId: id,
            role: decodeToken(token)?.userRole ?? null,
            password: values.password,
          });
          signIn(token, id);
        } catch (error) {
          if (!(error instanceof OfflineError)) throw error;
          const offline = await signInOffline(values);
          if (offline === null) throw error;
          signInAs(offline.token, offline.user, offline.dbUserId);
        }
      }}
    />
  );
}
