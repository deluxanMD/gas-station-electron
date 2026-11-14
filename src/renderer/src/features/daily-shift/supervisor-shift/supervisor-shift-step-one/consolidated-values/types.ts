import type { ConsolidatedShifts } from '@/features/shift/types';

export interface ConsolidatedValuesProps {
  consolidated: ConsolidatedShifts;
}

export interface ConsolidatedSectionDefinition {
  title: string;
  rows: readonly {
    label: string;
    cents: (consolidated: ConsolidatedShifts) => number;
  }[];
}
