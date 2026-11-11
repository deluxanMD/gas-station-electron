import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MANAGER_STEPS } from './constants';
import { useStepper } from './hooks';
import type { ManagerShiftProps } from './types';

export function ManagerShift({ onExit }: ManagerShiftProps): JSX.Element {
  const { stepIndex, isFirst, isLast, next, back } = useStepper(
    MANAGER_STEPS.length,
  );
  const step = MANAGER_STEPS[stepIndex];
  const StepComponent = step.component;

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">
          Step {stepIndex + 1} of {MANAGER_STEPS.length}
        </p>
        <CardTitle className="text-xl">{step.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <StepComponent
          formId={step.formId ?? ''}
          onNext={isLast ? onExit : next}
        />
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={isFirst ? onExit : back}>
            {isFirst ? 'Cancel' : 'Back'}
          </Button>
          {step.formId ? (
            <Button type="submit" form={step.formId}>
              {isLast ? (step.finishLabel ?? 'Finish') : 'Next'}
            </Button>
          ) : (
            <Button onClick={isLast ? onExit : next}>
              {isLast ? (step.finishLabel ?? 'Finish') : 'Next'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
