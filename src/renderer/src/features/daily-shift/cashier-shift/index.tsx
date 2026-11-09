import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CASHIER_STEPS } from './constants';
import { useStepper } from './hooks';
import type { CashierShiftProps } from './types';

export function CashierShift({ onExit }: CashierShiftProps): JSX.Element {
  const { stepIndex, isFirst, isLast, next, back } = useStepper(
    CASHIER_STEPS.length,
  );
  const step = CASHIER_STEPS[stepIndex];
  const StepComponent = step.component;

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">
          Step {stepIndex + 1} of {CASHIER_STEPS.length}
        </p>
        <CardTitle className="text-xl">{step.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <StepComponent formId={step.formId ?? ''} onNext={next} />
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
