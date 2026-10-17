import type { JSX } from 'react';
import { Button } from '@/components/ui/button';

export function App(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Button>Gas Station Portal</Button>
    </main>
  );
}

export default App;
