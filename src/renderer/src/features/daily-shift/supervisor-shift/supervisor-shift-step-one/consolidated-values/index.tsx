import type { JSX } from 'react';
import { ConsolidatedSection } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-one/consolidated-section';
import { CONSOLIDATED_SECTIONS } from './constants';
import type { ConsolidatedValuesProps } from './types';

export function ConsolidatedValues({
  consolidated,
}: ConsolidatedValuesProps): JSX.Element {
  const incomplete = consolidated.incompleteShiftIds.length;

  return (
    <section aria-label="Consolidated values" className="max-w-2xl space-y-4">
      {incomplete > 0 ? (
        <p role="alert" className="text-sm text-warning-foreground">
          {incomplete} selected shift(s) are missing credit totals, a daily
          summary or payouts and count as zero.
        </p>
      ) : null}
      {CONSOLIDATED_SECTIONS.map(({ title, rows }) => (
        <ConsolidatedSection
          key={title}
          title={title}
          rows={rows.map(({ label, cents }) => ({
            label,
            cents: cents(consolidated),
          }))}
        />
      ))}
    </section>
  );
}
