import {
  CASHIER_DRAFT_NAME,
  useCashierShiftStore,
} from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import {
  MANAGER_DRAFT_NAME,
  useManagerShiftStore,
} from '@/features/daily-shift/manager-shift/manager-shift-store';
import {
  SUPERVISOR_DRAFT_NAME,
  useSupervisorShiftStore,
} from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import {
  currentDraftScope,
  draftStorage,
  setDraftScope,
} from '@/lib/draft-storage';

// Each store's draft: where it is saved, how to empty it in memory, and how to bring the saved one back.
const DRAFTS = [
  {
    name: CASHIER_DRAFT_NAME,
    clear: (): void => {
      useCashierShiftStore.setState({
        creditTotals: null,
        dailySummary: null,
        cashClose: null,
      });
    },
    restore: async (): Promise<void> => {
      await useCashierShiftStore.persist.rehydrate();
    },
  },
  {
    name: SUPERVISOR_DRAFT_NAME,
    clear: (): void => {
      useSupervisorShiftStore.setState({
        fuel: null,
        fuelDelivery: null,
        fuelDips: null,
      });
    },
    restore: async (): Promise<void> => {
      await useSupervisorShiftStore.persist.rehydrate();
    },
  },
  {
    name: MANAGER_DRAFT_NAME,
    clear: (): void => {
      useManagerShiftStore.setState({
        scratchTickets: null,
        lottoReports: null,
        lottoReconciliation: null,
      });
    },
    restore: async (): Promise<void> => {
      await useManagerShiftStore.persist.rehydrate();
    },
  },
];

function clearMemory(): void {
  for (const { clear } of DRAFTS) clear();
}

/**
 * Starts keeping the entered figures for this user's shift, and brings back what was entered before a restart. The
 * figures of whoever or whatever came before are cleared first, so nothing carries over from another user or shift.
 */
export async function activateDrafts(
  userId: number,
  shiftClientId: string,
): Promise<void> {
  const next = `${userId}:${shiftClientId}`;
  if (currentDraftScope() === next) return;
  // With no scope the reset below writes nothing: it must not overwrite the draft about to be restored.
  setDraftScope(null);
  clearMemory();
  setDraftScope(next);
  await Promise.all(DRAFTS.map(({ restore }) => restore()));
}

/** Stops keeping figures (signed out, or no shift open) and forgets them from memory. Saved drafts stay on disk. */
export function deactivateDrafts(): void {
  setDraftScope(null);
  clearMemory();
}

/** The shift was saved: its drafts are no longer wanted anywhere. */
export function discardDrafts(): void {
  for (const { name } of DRAFTS) draftStorage.removeItem(name);
  deactivateDrafts();
}
