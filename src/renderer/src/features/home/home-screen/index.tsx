import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SECTIONS } from './constants';
import type { HomeScreenProps } from './types';

export function HomeScreen({
  userId,
  onSignOut,
}: HomeScreenProps): JSX.Element {
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
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map(({ title, description }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </section>
    </div>
  );
}
