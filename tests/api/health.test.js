const health = require('../../api/health/index');
const { Client } = require('../../api/db');

jest.mock('../../api/db', () => ({ Client: jest.fn() }));

describe('health endpoint', () => {
  let origDb;
  beforeEach(() => {
    jest.clearAllMocks();
    origDb = process.env.AZURE_DATABASE_URL;
  });
  afterEach(() => {
    if (origDb === undefined) delete process.env.AZURE_DATABASE_URL;
    else process.env.AZURE_DATABASE_URL = origDb;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.AI_MODEL;
  });

  test('returns not_configured when env missing', async () => {
    const context = { res: null, log: { error: jest.fn() } };
    await health(context, {});
    expect(context.res.status).toBe(200);
    expect(context.res.body.checks.env.databaseUrl).toBe('not_configured');
  });

  test('db ok and anthropic not configured', async () => {
    process.env.AZURE_DATABASE_URL = 'sqlserver://host:1433;database=test;user=u;password=p';
    const mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({}),
      end: jest.fn().mockResolvedValue(undefined),
    };
    Client.mockImplementation(() => mockClient);
    const context = { res: null };
    await health(context, {});
    expect(context.res.status).toBe(200);
    expect(context.res.body.checks.database).toBe('ok');
    expect(context.res.body.checks.anthropic).toBe('not_configured');
  });

  test('anthropic model not found sets error', async () => {
    process.env.AZURE_DATABASE_URL = 'sqlserver://host;database=test';
    process.env.ANTHROPIC_API_KEY = 'k';
    process.env.AI_MODEL = 'not-exist';
    const mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({}),
      end: jest.fn().mockResolvedValue(undefined),
    };
    Client.mockImplementation(() => mockClient);
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ models: [{ id: 'other' }] }) });
    const context = { res: null };
    await health(context, {});
    expect(context.res.status).toBe(503);
    expect(context.res.body.checks.anthropic).toMatch(/model_not_found/);
  });
});
