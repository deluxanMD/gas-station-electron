import type { JSX } from 'react';
import { LoginScreen } from '@/features/auth/login-screen';

export function App(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-16 items-center border-b border-border bg-card px-6">
        <span className="text-lg font-semibold tracking-wide text-primary">
          Gas Station Portal
        </span>
      </header>
      <main className="flex flex-1 flex-col">
        <LoginScreen />
      </main>
    </div>
  );
}

export default App;
