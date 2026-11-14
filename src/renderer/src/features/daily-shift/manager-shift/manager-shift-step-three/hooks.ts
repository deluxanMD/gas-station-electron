import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useAuthStore } from '@/features/auth/auth-store';
import { useOpenShift } from '@/features/shift/hooks';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import {
  buildScratchTicketsRequest,
  fetchLatestScratchTickets,
  saveScratchTickets,
} from './api';
import { EMPTY_SCRATCH_TICKETS, SCRATCH_DENOMINATIONS } from './constants';
import { scratchTicketsSchema } from './schema';
import type {
  ScratchTicketCalculation,
  ScratchTicketsValues,
  UseScratchTicketsFormOptions,
  UseScratchTicketsFormReturn,
} from './types';

function toCount(value: string): number | null {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

// Sold = Open + Activations - Close; Amount = Sold x ticket price.
function calculate(
  row: ScratchTicketsValues['rows'][number],
  denomination: number,
): ScratchTicketCalculation {
  const open = toCount(row.open);
  const close = toCount(row.close);
  const activations = toCount(row.activations);
  if (open === null || close === null || activations === null) {
    return { soldCount: 0, amountCents: 0 };
  }
  const soldCount = open + activations - close;
  return { soldCount, amountCents: soldCount * denomination * 100 };
}

export function useScratchTicketsForm({
  onNext,
}: UseScratchTicketsFormOptions): UseScratchTicketsFormReturn {
  const saved = useManagerShiftStore((s) => s.scratchTickets);
  const openShift = useOpenShift();
  const setScratchTickets = useManagerShiftStore((s) => s.setScratchTickets);

  const defaultValues: ScratchTicketsValues = saved
    ? {
        shiftNumber: String(saved.shiftNumber),
        rows: saved.rows.map((row) => ({
          open: String(row.openCount),
          close: String(row.closeCount),
          activations: String(row.activationsCount),
        })),
      }
    : {
        ...EMPTY_SCRATCH_TICKETS,
        // The sheet is for the shift in progress; still editable.
        shiftNumber: openShift ? String(openShift.id) : '',
      };

  const dbUserId = useAuthStore((s) => s.dbUserId);
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = useForm<ScratchTicketsValues>({
    resolver: zodResolver(scratchTicketsSchema),
    defaultValues,
  });

  // Open is the previous report's Close. It is only prefilled for a fresh form,
  // and a failed lookup leaves the zeros (still editable) rather than blocking.
  const hasSaved = saved !== null;
  useEffect(() => {
    if (hasSaved) return;
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const latest = await fetchLatestScratchTickets();
        if (cancelled || !latest) return;
        for (const [index, denomination] of SCRATCH_DENOMINATIONS.entries()) {
          const line = latest.lines.find(
            (l) => l.denomination === denomination,
          );
          const name = `rows.${index}.open` as const;
          if (line && form.getValues(name) === '0') {
            form.setValue(name, String(line.closeCount));
          }
        }
      } catch {
        // Keep the zeros; the manager can still type the counts.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [form, hasSaved]);

  const rows = useWatch({ control: form.control, name: 'rows' });
  const calculations = rows.map((row, index) =>
    calculate(row, SCRATCH_DENOMINATIONS[index]),
  );
  const totalAmountCents = calculations.reduce(
    (sum, { amountCents }) => sum + amountCents,
    0,
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    const savedRows = values.rows.map((row, index) => {
      const denomination = SCRATCH_DENOMINATIONS[index];
      const { soldCount, amountCents } = calculate(row, denomination);
      return {
        denomination,
        openCount: Number(row.open),
        closeCount: Number(row.close),
        activationsCount: Number(row.activations),
        soldCount,
        amountCents,
      };
    });
    const data = {
      shiftNumber: Number(values.shiftNumber),
      rows: savedRows,
      totalAmountCents: savedRows.reduce((s, r) => s + r.amountCents, 0),
    };

    // The stored values are only set after a successful save, so identical ones
    // mean this sheet is already saved (the manager came back to this step).
    if (JSON.stringify(data) !== JSON.stringify(saved)) {
      if (dbUserId === null) {
        setSaveError('Sign in again to save the scratch tickets.');
        return;
      }
      setSaveError(null);
      try {
        await saveScratchTickets(buildScratchTicketsRequest(dbUserId, data));
      } catch (error) {
        setSaveError(
          error instanceof Error
            ? error.message
            : 'Saving the scratch tickets failed.',
        );
        return;
      }
    }
    setScratchTickets(data);
    onNext();
  });

  return { form, handleSubmit, calculations, totalAmountCents, saveError };
}
