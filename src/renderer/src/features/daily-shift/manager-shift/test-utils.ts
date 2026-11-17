import { vi } from 'vitest';

export interface ManagerShiftApiStub {
  // GET /scratch-tickets/latest; a null report means none saved yet.
  scratchLatest?: Response;
  // GET /lotto-reports/latest; a null slip means none saved yet.
  lottoLatest?: Response;
}

// Answers what the manager flow calls: today's shifts (step 1), the scratch
// ticket and lotto report endpoints they read the previous figures from; saving goes to the device, so anything else fails the test.
export function stubManagerShiftApi({
  scratchLatest = Response.json({ data: null }),
  lottoLatest = Response.json({ data: null }),
}: ManagerShiftApiStub = {}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string) => {
    if (url.endsWith('/scratch-tickets/latest')) {
      return Promise.resolve(scratchLatest.clone());
    }
    if (url.endsWith('/lotto-reports/latest')) {
      return Promise.resolve(lottoLatest.clone());
    }
    return /\/shifts\?role=CASHIER$/.test(url)
      ? Promise.resolve(Response.json({ data: [] }))
      : Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
