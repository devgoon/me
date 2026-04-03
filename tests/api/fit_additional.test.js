const { Client } = require('../../api/db');
const fitHandler = require('../../api/fit/index');

jest.mock('../../api/db', () => ({ Client: jest.fn() }));

describe('fit API additional tests', () => {
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
    if (originalDatabaseUrl === undefined) delete process.env.AZURE_DATABASE_URL;
    else process.env.AZURE_DATABASE_URL = originalDatabaseUrl;
  });

  test('returns 400 if jobDescription missing', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const context = { req: { method: 'POST', body: {} }, res: null, log: { warn: jest.fn() } };
    await fitHandler(context, context.req);
    expect(context.res.status).toBe(400);
    delete process.env.ANTHROPIC_API_KEY;
  });
});
