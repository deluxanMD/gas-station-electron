import { apiRequest } from '@/lib/api';
import type { ScratchTicketsData } from '@/features/daily-shift/manager-shift/types';
import type {
  LatestScratchTicketsResponse,
  ScratchTicketsReport,
  ScratchTicketsRequest,
} from './types';

export function buildScratchTicketsRequest(
  userId: number,
  data: ScratchTicketsData,
): ScratchTicketsRequest {
  return {
    userId,
    shiftNumber: data.shiftNumber,
    lines: data.rows.map((row) => ({
      denomination: row.denomination,
      openCount: row.openCount,
      closeCount: row.closeCount,
      activationsCount: row.activationsCount,
    })),
  };
}

// A 409 (this shift sheet is already saved for the date) is surfaced to the
// manager: a repeat of identical values is skipped before reaching here.
export async function saveScratchTickets(
  request: ScratchTicketsRequest,
): Promise<void> {
  await apiRequest(
    'scratch-tickets',
    { method: 'POST', body: JSON.stringify(request) },
    'Saving the scratch tickets failed.',
  );
}

// The latest saved report; its close counts are the next report's open counts.
export async function fetchLatestScratchTickets(): Promise<ScratchTicketsReport | null> {
  const body = await apiRequest<LatestScratchTicketsResponse>(
    'scratch-tickets/latest',
    undefined,
    'Unable to load the previous scratch ticket counts.',
  );
  return body.data;
}
