import type { JSX } from 'react';
import { Modal } from '@/components/modal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShiftStatus } from '@/features/home/shift-status';
import { useModuleSelection, useShiftHeader, useVisibleModules } from './hooks';
import type { HomeScreenProps } from './types';

export function HomeScreen({
  userId,
  onSignOut,
  onSelectModule,
}: HomeScreenProps): JSX.Element {
  const modules = useVisibleModules();
  const shift = useShiftHeader();
  const { confirmOpen, setConfirmOpen, select, confirm, isLocked } =
    useModuleSelection(onSelectModule);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <section className="flex items-center justify-between rounded-xl bg-sidebar px-8 py-6 text-sidebar-foreground">
        <div>
          <h1 className="text-2xl font-light">Welcome, {userId}</h1>
          <p className="mt-1 text-sm text-sidebar-foreground/80">
            Choose an area to get started.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ShiftStatus
            current={shift.current}
            onStart={shift.start}
            starting={shift.starting}
            startError={shift.error}
            onRetry={shift.retry}
          />
          <Button variant="secondary" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ id, title }) => {
          const locked = isLocked(id);
          return (
            <button
              key={id}
              type="button"
              disabled={locked}
              onClick={() => select(id)}
              className="group rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Card className="h-full transition-all group-hover:shadow-md group-active:scale-[0.98] group-disabled:shadow-none group-disabled:group-active:scale-100">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {locked ? (
                    <p className="text-sm text-muted-foreground">
                      Start your shift first.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </button>
          );
        })}
      </section>
      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Ready to close your shift?"
        description="You are about to enter the closing steps. Your shift ends when you save and close at the last step."
        approveLabel="Continue"
        cancelLabel="Not yet"
        onApprove={confirm}
      />
    </div>
  );
}
