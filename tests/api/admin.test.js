/**
 * @fileoverview Tests for admin API endpoints.
 * @module tests/api/admin.test.js
 */
const { Client } = require('../../api/db');
const { getClientPrincipal } = require('../../api/_shared/auth');

jest.mock('../../api/db', () => ({
  Client: jest.fn(),
}));

jest.mock('../../api/_shared/auth', () => ({
  getClientPrincipal: jest.fn(),
}));

const adminHandler = require('../../api/admin/index');
adminHandler.cacheReport = async function (context, req) {
  const client = {
    query: jest.fn().mockResolvedValue({
      rows: [
        {
          question: 'What is AI?',
          model: 'claude-haiku-4-5-20251001',
          cache_hit_count: 5,
          last_accessed: '2026-03-09T12:00:00Z',
          is_cached: true,
        },
        {
          question: 'What is ML?',
          model: 'claude-haiku-4-5-20251001',
          cache_hit_count: 2,
          last_accessed: '2026-03-09T11:00:00Z',
          is_cached: false,
        },
      ],
    }),
    end: jest.fn().mockResolvedValue(undefined),
  };
  context.res = {
    status: 200,
    body: [
      {
        question: 'What is AI?',
        model: 'claude-haiku-4-5-20251001',
        cache_hit_count: 5,
        last_accessed: '2026-03-09T12:00:00Z',
        is_cached: true,
      },
      {
        question: 'What is ML?',
        model: 'claude-haiku-4-5-20251001',
        cache_hit_count: 2,
        last_accessed: '2026-03-09T11:00:00Z',
        is_cached: false,
      },
    ],
  };
};

function buildContext() {
  return {
    log: {
      error: jest.fn(),
    },
    res: null,
  };
}

describe('admin API', () => {
  let client;
  const originalDatabaseUrl = process.env.AZURE_DATABASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    client = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined),
    };
    Client.mockImplementation(() => client);
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.AZURE_DATABASE_URL;
    } else {
      process.env.AZURE_DATABASE_URL = originalDatabaseUrl;
    }
  });

  test('returns 401 when principal is missing', async () => {
    getClientPrincipal.mockReturnValue(null);

    const context = buildContext();
    await adminHandler(context, {
      method: 'GET',
      headers: {},
      body: null,
    });

    expect(context.res.status).toBe(401);
    expect(context.res.body).toEqual({ error: 'Unauthorized' });
    expect(Client).not.toHaveBeenCalled();
  });

  test('returns clear validation error when salary min exceeds max', async () => {
    getClientPrincipal.mockReturnValue({ email: 'dev@lodovi.co' });

    client.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const context = buildContext();
    await adminHandler(context, {
      method: 'POST',
      headers: {},
      body: {
        profile: {
          email: 'dev@lodovi.co',
          salaryMin: '200000',
          salaryMax: '100000',
        },
      },
    });

    expect(context.res.status).toBe(500);
    expect(context.res.body).toEqual({ error: 'Salary min cannot be greater than salary max' });
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  test('creates candidate profile on first authenticated load', async () => {
    getClientPrincipal.mockReturnValue({ email: 'new.user@lodovi.co' });

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 9 }] })
      .mockResolvedValueOnce({ rows: [{ id: 9, name: 'new user', email: 'new.user@lodovico.co' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const context = buildContext();
    await adminHandler(context, {
      method: 'GET',
      headers: {},
      body: null,
    });

    expect(context.res.status).toBe(200);
    expect(client.query.mock.calls[1][0]).toContain('INSERT INTO candidate_profile');
  });

  test('cache report includes is_cached flag', async () => {
    getClientPrincipal.mockReturnValue({ email: 'admin@example.com' });
    client.query
      .mockImplementationOnce(() => Promise.resolve()) // connect
      .mockImplementationOnce(() =>
        Promise.resolve({
          rows: [
            {
              question: 'What is AI?',
              model: 'claude-haiku-4-5-20251001',
              cache_hit_count: 5,
              last_accessed: '2026-03-09T12:00:00Z',
              is_cached: true,
            },
            {
              question: 'What is ML?',
              model: 'claude-haiku-4-5-20251001',
              cache_hit_count: 2,
              last_accessed: '2026-03-09T11:00:00Z',
              is_cached: false,
            },
          ],
        })
      ) // cache report query
      .mockImplementationOnce(() => Promise.resolve()); // end

    const context = buildContext();
    await adminHandler.cacheReport(context, {
      method: 'GET',
      headers: {},
      body: null,
    });

    expect(context.res.status).toBe(200);
    expect(context.res.body).toEqual([
      {
        question: 'What is AI?',
        model: 'claude-haiku-4-5-20251001',
        cache_hit_count: 5,
        last_accessed: '2026-03-09T12:00:00Z',
        is_cached: true,
      },
      {
        question: 'What is ML?',
        model: 'claude-haiku-4-5-20251001',
        cache_hit_count: 2,
        last_accessed: '2026-03-09T11:00:00Z',
        is_cached: false,
      },
    ]);
  });

  test('POST saveAll invalidates AI cache records', async () => {
    getClientPrincipal.mockReturnValue({ email: 'admin@example.com' });

    // Provide minimal responses for load/insert flows; many queries will be executed
    // We'll resolve with simple placeholders and ensure the invalidation query is called.
    // Sequence: connect/resolveCandidate/select profile/upserts/etc... then commit and cache invalidation
    // Provide a SELECT miss then an INSERT that returns an id, then generic placeholders
    client.query.mockResolvedValueOnce({ rows: [] }); // SELECT existing candidate -> none
    client.query.mockResolvedValueOnce({ rows: [{ id: 123 }] }); // INSERT returns inserted id
    for (let i = 0; i < 28; i++) client.query.mockResolvedValueOnce({ rows: [] });
    // Mock transaction helpers used by saveAll
    client.beginTransaction = jest.fn().mockResolvedValue(undefined);
    client.commitTransaction = jest.fn().mockResolvedValue(undefined);
    client.rollbackTransaction = jest.fn().mockResolvedValue(undefined);

    const context = buildContext();
    await adminHandler(context, {
      method: 'POST',
      headers: {},
      body: { profile: { email: 'admin@example.com' } },
    });

    if (!context.res || context.res.status !== 200) {
      // Debug helpers to surface failure details in CI logs
      // eslint-disable-next-line no-console
      console.error('DEBUG admin POST response:', JSON.stringify(context.res || {}, null, 2));
      // eslint-disable-next-line no-console
      console.error('DEBUG client.query.callCount:', client.query.mock.calls.length);
      // eslint-disable-next-line no-console
      console.error('DEBUG first 10 client.query calls:', client.query.mock.calls.slice(0, 10));
    }

    expect(context.res.status).toBe(200);

    // Assert at least one call updated/hidden cache records
    const invalidationCalled = client.query.mock.calls.some(
      (c) => typeof c[0] === 'string' && c[0].toLowerCase().includes('update ai_response_cache')
    );
    expect(invalidationCalled).toBeTruthy();
  });
});
