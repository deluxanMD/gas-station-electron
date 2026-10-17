import type { JSX } from 'react';
import { LoginForm } from '@/features/auth/login';

export function App(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">Gas Station Portal</h1>
      <LoginForm />
    </main>
  );
}

export default App;
