vi.mock('../../api/db', () => ({ Client: vi.fn() }));
const actualAuth = require('../../api/_shared/auth');
const { Client } = require('../../api/db');

describe('cache-report', () => {
  let client;
  beforeEach(() => {
    vi.clearAllMocks();
    client = { connect: vi.fn(), query: vi.fn(), end: vi.fn() };
    require('../../api/db').__setTestClient(client);
    client.queryWithRetry = client.query;
  });

  test('returns 401 when unauthenticated', async () => {
    vi.spyOn(actualAuth, 'getClientPrincipal').mockReturnValue(null);
    const cacheReport = require('../../api/cache-report/index');
    const context = { res: null };
    await cacheReport(context, { headers: {} });
    expect(context.res.status).toBe(401);
  });

  test('returns mapped rows when authenticated', async () => {
    vi.spyOn(actualAuth, 'getClientPrincipal').mockReturnValue({ email: 'a@b.c', roles: ['admin'] });
    process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    client.connect.mockResolvedValue(undefined);
    client.query.mockResolvedValue({
      rows: [
        { question: 'q', model: 'm', cache_hit_count: 1, last_accessed: null, is_cached: true },
      ],
    });
    client.end.mockResolvedValue(undefined);

    const cacheReport = require('../../api/cache-report/index');
    const context = { res: null };
    await cacheReport(context, { headers: {} });
    expect(context.res.status).toBe(200);
    expect(Array.isArray(context.res.body)).toBe(true);
    expect(context.res.body[0].question).toBe('q');
  });
});
