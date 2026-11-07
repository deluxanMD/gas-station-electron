import type { JSX } from 'react';
import { LoginScreen } from '@/features/auth/login-screen';

export function App(): JSX.Element {
  return (
    <main className="min-h-screen bg-muted/40">
      <LoginScreen />
    </main>
  );
}

export default App;
