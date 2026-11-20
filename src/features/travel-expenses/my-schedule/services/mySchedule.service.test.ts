import { fetchScheduleTrips } from './mySchedule.service';

jest.mock('../../../../helpers/api-url', () => ({ buildApiUrl: (path: string) => `http://localhost/api/${path}` }));
jest.mock('../shared/session', () => ({ getAuthHeaders: () => ({}), getCurrentSessionUser: () => ({ id: 1 }) }));

test('loads vouchers once across trips and assigns them to the matching request and item', async () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn(async (url: string) => {
    const data = url.includes('expense-vouchers') ? [
      { expense_voucher_id: 501, id_request: 11, expense_detail_id: 101, amount: '7' },
      { expense_voucher_id: 502, id_request: 22, expense_detail_id: 202, amount: '9' },
    ] : url.includes('expense-requests') ? [
      { id_request: 11, id_trip: 1, details: [{ expense_detail_id: 101 }, { expense_detail_id: 102 }] },
      { id_request: 22, id_trip: 2, details: [{ expense_detail_id: 202 }] },
    ] : [{ id_trip: 1 }, { id_trip: 2 }];
    return { ok: true, json: async () => ({ success: true, data }) } as Response;
  });
  global.fetch = mockFetch as typeof fetch;
  try {
    const trips = await fetchScheduleTrips({ id: 1, profileId: 1 }, (key) => key);
    expect(mockFetch.mock.calls.filter(([url]) => url.includes('expense-vouchers'))).toHaveLength(1);
    expect(trips[0].expenseRequests[0].details[0].expenseVouchers[0].expenseVoucherId).toBe(501);
    expect(trips[0].expenseRequests[0].details[1].expenseVouchers).toEqual([]);
    expect(trips[1].expenseRequests[0].details[0].expenseVouchers[0].expenseVoucherId).toBe(502);
  } finally {
    global.fetch = originalFetch;
  }
});
