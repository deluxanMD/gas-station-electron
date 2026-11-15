import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { useShiftFlow } from './hooks';
import type { DailyShiftScreenProps } from './types';

export function DailyShiftScreen({
  onExit,
}: DailyShiftScreenProps): JSX.Element {
  const shiftFlow = useShiftFlow(onExit);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <section className="flex items-center justify-between rounded-xl bg-sidebar px-8 py-6 text-sidebar-foreground">
        <h1 className="text-2xl font-light">Daily Shift</h1>
        <Button variant="secondary" onClick={onExit}>
          Back to home
        </Button>
      </section>
      {shiftFlow ?? (
        <p className="text-muted-foreground">
          The daily shift is not available for your role yet.
        </p>
      )}
    </div>
  );
}
