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
  // The day the sheet belongs to, in the device's local time (the server would otherwise use the day it receives it).
  businessDate: string,
): ScratchTicketsRequest {
  return {
    userId,
    businessDate,
    shiftNumber: data.shiftNumber,
    lines: data.rows.map((row) => ({
      denomination: row.denomination,
      openCount: row.openCount,
      closeCount: row.closeCount,
      activationsCount: row.activationsCount,
    })),
  };
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
