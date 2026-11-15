import { useState } from 'react';
import type { UseStepper } from './types';

export function useStepper(stepCount: number): UseStepper {
  const [stepIndex, setStepIndex] = useState(0);

  return {
    stepIndex,
    isFirst: stepIndex === 0,
    isLast: stepIndex === stepCount - 1,
    next: () => setStepIndex((i) => Math.min(i + 1, stepCount - 1)),
    back: () => setStepIndex((i) => Math.max(i - 1, 0)),
  };
}
