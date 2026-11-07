import type { JSX } from 'react';
import { LoginForm } from '@/features/auth/login';

export function LoginScreen(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <section className="rounded-xl bg-sidebar px-8 py-6 text-sidebar-foreground">
        <h1 className="text-2xl font-light">Welcome back</h1>
        <p className="mt-1 text-sm text-sidebar-foreground/80">
          Manage fuel, sales and stock across your stations.
        </p>
      </section>
      <section className="flex flex-1 items-center justify-center rounded-xl bg-card p-8 shadow-sm">
        <div className="grid w-full max-w-sm gap-6">
          <div>
            <h2 className="text-3xl font-light">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to continue.
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
