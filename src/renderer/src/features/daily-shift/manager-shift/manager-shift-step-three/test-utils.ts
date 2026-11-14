import { vi } from 'vitest';

export interface ScratchTicketApiStub {
  // The report returned by GET /scratch-tickets/latest; null means none saved yet.
  latest?: Response;
  save?: Response;
}

// Answers what the manager flow calls up to and including step 3: today's
// shifts (step 1), the scratch ticket endpoints and closing the shift; anything else fails the test.
export function stubScratchTicketApi({
  latest = Response.json({ data: null }),
  save = Response.json({ data: { id: 1 } }, { status: 201 }),
}: ScratchTicketApiStub = {}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url.endsWith('/scratch-tickets/latest')) {
      return Promise.resolve(latest.clone());
    }
    if (url.endsWith('/scratch-tickets') && init?.method === 'POST') {
      return Promise.resolve(save.clone());
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
