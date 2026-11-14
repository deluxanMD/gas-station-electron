import type { JSX } from 'react';
import { formatDateTime } from '@/lib/utils';
import type { ShiftOptionProps } from './types';

export function ShiftOption({
  shift,
  checked,
  onToggle,
}: ShiftOptionProps): JSX.Element {
  return (
    <label className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(String(shift.id))}
      />
      <span>
        {shift.userName} · Started {formatDateTime(shift.startTime)} ·{' '}
        {shift.endTime
          ? `Ended ${formatDateTime(shift.endTime)}`
          : 'In progress'}
      </span>
    </label>
  );
}
