import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVisibleModules } from './hooks';
import type { HomeScreenProps } from './types';

export function HomeScreen({
  userId,
  onSignOut,
  onSelectModule,
}: HomeScreenProps): JSX.Element {
  const modules = useVisibleModules();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <section className="flex items-center justify-between rounded-xl bg-sidebar px-8 py-6 text-sidebar-foreground">
        <div>
          <h1 className="text-2xl font-light">Welcome, {userId}</h1>
          <p className="mt-1 text-sm text-sidebar-foreground/80">
            Choose an area to get started.
          </p>
        </div>
        <Button variant="secondary" onClick={onSignOut}>
          Sign out
        </Button>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ id, title }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectModule(id)}
            className="group rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-all group-hover:shadow-md group-active:scale-[0.98]">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">{title}</CardTitle>
              </CardHeader>
              <CardContent />
            </Card>
          </button>
        ))}
      </section>
    </div>
  );
}
