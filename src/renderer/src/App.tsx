import type { JSX } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LoginScreen } from '@/features/auth/login-screen';

export function App(): JSX.Element {
  return (
    <main className="relative min-h-screen bg-muted/40">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <LoginScreen />
    </main>
  );
}

export default App;
