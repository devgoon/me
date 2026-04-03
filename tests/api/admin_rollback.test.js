const { Client } = require('../../api/db');
const { getClientPrincipal } = require('../../api/_shared/auth');
jest.mock('../../api/db', () => ({ Client: jest.fn() }));
jest.mock('../../api/_shared/auth', () => ({ getClientPrincipal: jest.fn() }));

const adminHandler = require('../../api/admin/index');

describe('admin saveAll rollback behavior', () => {
  let client;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    getClientPrincipal.mockReturnValue({ email: 'admin@example.com' });
    client = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined),
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    };
    Client.mockImplementation(() => client);
  });

  test('rolls back transaction on failure and returns 500', async () => {
    // resolveCandidate select -> existing id returned
    client.query.mockResolvedValueOnce({ rows: [{ id: 123 }] });
    // Simulate a DB failure after transaction begins (e.g., during saveAll queries)
    client.query.mockRejectedValueOnce(new Error('db-failure'));

    const context = { res: null, log: { error: jest.fn() } };
    await adminHandler(context, {
      method: 'POST',
      headers: {},
      body: { profile: { email: 'admin@example.com' } },
    });

    expect(context.res.status).toBe(500);
    // rollbackTransaction should have been called
    expect(client.rollbackTransaction).toHaveBeenCalled();
  });
});
