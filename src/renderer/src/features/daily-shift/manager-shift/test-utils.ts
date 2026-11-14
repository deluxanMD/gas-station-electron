import { vi } from 'vitest';

export interface ManagerShiftApiStub {
  // GET /scratch-tickets/latest; a null report means none saved yet.
  scratchLatest?: Response;
  scratchSave?: Response;
  // GET /lotto-reports/latest; a null slip means none saved yet.
  lottoLatest?: Response;
  lottoSave?: Response;
}

// Answers what the manager flow calls: today's shifts (step 1), the scratch
// ticket and lotto report endpoints, and closing the shift; anything else fails the test.
export function stubManagerShiftApi({
  scratchLatest = Response.json({ data: null }),
  scratchSave = Response.json({ data: { id: 1 } }, { status: 201 }),
  lottoLatest = Response.json({ data: null }),
  lottoSave = Response.json({ data: { id: 1 } }, { status: 201 }),
}: ManagerShiftApiStub = {}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const post = init?.method === 'POST';
    if (url.endsWith('/scratch-tickets/latest')) {
      return Promise.resolve(scratchLatest.clone());
    }
    if (url.endsWith('/scratch-tickets') && post) {
      return Promise.resolve(scratchSave.clone());
    }
    if (url.endsWith('/lotto-reports/latest')) {
      return Promise.resolve(lottoLatest.clone());
    }
    if (url.endsWith('/lotto-reports') && post) {
      return Promise.resolve(lottoSave.clone());
    }
    if (/\/shifts\/\d+\/close$/.test(url)) {
      return Promise.resolve(Response.json({ data: {} }));
    }
    return /\/shifts\?role=CASHIER$/.test(url)
      ? Promise.resolve(Response.json({ data: [] }))
      : Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
