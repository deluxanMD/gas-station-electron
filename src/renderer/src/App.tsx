import type { JSX } from 'react';
import { login } from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/auth-store';
import { LoginScreen } from '@/features/auth/login-screen';
import { HomeScreen } from '@/features/home/home-screen';

export function App(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center border-b border-border bg-card px-6">
        <span className="text-lg font-semibold tracking-wide text-primary">
          Gas Station Portal
        </span>
      </header>
      <main className="flex flex-1 flex-col">
        {user ? (
          <HomeScreen userId={user.userId} onSignOut={signOut} />
        ) : (
          <LoginScreen
            onSubmit={async (values) => signIn(await login(values))}
          />
        )}
      </main>
    </div>
  );
}

export default App;
