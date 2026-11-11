import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SUPERVISOR_STEPS } from './constants';
import { useStepper } from './hooks';
import type { SupervisorShiftProps } from './types';

export function SupervisorShift({ onExit }: SupervisorShiftProps): JSX.Element {
  const { stepIndex, isFirst, isLast, next, back } = useStepper(
    SUPERVISOR_STEPS.length,
  );
  const step = SUPERVISOR_STEPS[stepIndex];
  const StepComponent = step.component;

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">
          Step {stepIndex + 1} of {SUPERVISOR_STEPS.length}
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
              {isLast ? 'Finish' : 'Next'}
            </Button>
          ) : (
            <Button onClick={isLast ? onExit : next}>
              {isLast ? 'Finish' : 'Next'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
