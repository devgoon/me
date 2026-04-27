const cacheReport = require('../../api/cache-report/index');
const { Client } = require('../../api/db');
const { getClientPrincipal } = require('../../api/_shared/auth');

jest.mock('../../api/db', () => ({ Client: jest.fn() }));
jest.mock('../../api/_shared/auth', () => ({ getClientPrincipal: jest.fn() }));

describe('cache-report', () => {
  let client;
  beforeEach(() => {
    jest.clearAllMocks();
    client = { connect: jest.fn(), query: jest.fn(), end: jest.fn() };
    Client.mockImplementation(() => client);
    client.queryWithRetry = client.query;
  });

  test('returns 401 when unauthenticated', async () => {
    getClientPrincipal.mockReturnValue(null);
    const context = { res: null };
    await cacheReport(context, { headers: {} });
    expect(context.res.status).toBe(401);
  });

  test('returns mapped rows when authenticated', async () => {
    getClientPrincipal.mockReturnValue({ email: 'a@b.c' });
    process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    client.connect.mockResolvedValue(undefined);
    client.query.mockResolvedValue({
      rows: [
        { question: 'q', model: 'm', cache_hit_count: 1, last_accessed: null, is_cached: true },
      ],
    });
    client.end.mockResolvedValue(undefined);

    const context = { res: null };
    await cacheReport(context, { headers: {} });
    expect(context.res.status).toBe(200);
    expect(Array.isArray(context.res.body)).toBe(true);
    expect(context.res.body[0].question).toBe('q');
  });
});
