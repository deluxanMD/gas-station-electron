import { useState, type JSX } from 'react';
import { login, type AuthUser } from '@/features/auth/api';
import { LoginScreen } from '@/features/auth/login-screen';
import { HomeScreen } from '@/features/home/home-screen';

export function App(): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center border-b border-border bg-card px-6">
        <span className="text-lg font-semibold tracking-wide text-primary">
          Gas Station Portal
        </span>
      </header>
      <main className="flex flex-1 flex-col">
        {user ? (
          <HomeScreen userId={user.userId} onSignOut={() => setUser(null)} />
        ) : (
          <LoginScreen
            onSubmit={async (values) => setUser(await login(values))}
          />
        )}
      </main>
    </div>
  );
}

export default App;
