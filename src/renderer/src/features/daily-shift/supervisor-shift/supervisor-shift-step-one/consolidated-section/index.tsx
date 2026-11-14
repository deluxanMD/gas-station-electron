import { useId, type JSX } from 'react';
import { formatCentsAsAmount } from '@/lib/money';
import type { ConsolidatedSectionProps } from './types';

export function ConsolidatedSection({
  title,
  rows,
}: ConsolidatedSectionProps): JSX.Element {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-md border border-border"
    >
      <h3 id={headingId} className="bg-muted px-4 py-2 font-medium">
        {title}
      </h3>
      <dl>
        {rows.map(({ label, cents }) => (
          <div
            key={label}
            className="grid grid-cols-[1fr_2fr] border-t border-border px-4 py-2"
          >
            <dt>{label}</dt>
            <dd>{formatCentsAsAmount(cents)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
