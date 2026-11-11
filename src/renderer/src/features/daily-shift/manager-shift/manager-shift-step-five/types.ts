import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { LossAttribution } from '@/features/daily-shift/manager-shift/types';
import type { lottoReconciliationSchema } from './schema';

// Amounts stay as the text the manager typed; they become cents on submit.
export type LottoReconciliationValues = z.infer<
  typeof lottoReconciliationSchema
>;

export interface LottoReconciliationProps {
  formId: string;
  onNext: () => void;
}

export type ReconciliationKey =
  | 'instant'
  | 'online'
  | 'total'
  | 'olgPayout'
  | 'lottoNet'
  | 'redemNet'
  | 'net'
  | 'activationsOlg'
  | 'activationsShift'
  | 'bottomNet';

export type ReconciliationRow =
  | {
      kind: 'value';
      key: ReconciliationKey;
      label: string;
      gapBefore?: boolean;
    }
  | {
      kind: 'input';
      key: 'bullock' | 'bullPayouts' | 'bullLottoWinner';
      label: string;
    };

export interface LossAttributionOption {
  value: Exclude<LossAttribution, ''>;
  label: string;
}

// Cents, signed. All derived from earlier steps plus the manager's entries.
export interface LottoReconciliationFigures {
  values: Record<ReconciliationKey, number>;
  activationsNet: number;
  // Lotto Net + Redeem Net + Activations Net + Cash Net.
  summaryTotal: number;
}

export interface UseLottoReconciliationFormOptions {
  onNext: () => void;
}

export interface UseLottoReconciliationFormReturn {
  form: UseFormReturn<LottoReconciliationValues>;
  handleSubmit: ReturnType<
    UseFormReturn<LottoReconciliationValues>['handleSubmit']
  >;
  figures: LottoReconciliationFigures;
  // Over/short exists but is not attributed yet.
  needsAttribution: boolean;
}
