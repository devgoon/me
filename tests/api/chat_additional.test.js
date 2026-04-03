const { Client } = require('../../api/db');
const chatHandler = require('../../api/chat/index');

jest.mock('../../api/db', () => ({ Client: jest.fn() }));

describe('chat API additional tests', () => {
  let client;
  const originalDatabaseUrl = process.env.AZURE_DATABASE_URL;
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.ANTHROPIC_API_KEY = 'test-key';

    client = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined),
    };
    Client.mockImplementation(() => client);

    // Order of queries: cache select, then loadCandidateContext sequence
    client.query
      .mockResolvedValueOnce({ rows: [] }) // cache select -> miss
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'X' }] }) // profile
      .mockResolvedValueOnce({ rows: [] }) // experiences
      .mockResolvedValueOnce({ rows: [] }) // skills
      .mockResolvedValueOnce({ rows: [] }) // gaps
      .mockResolvedValueOnce({ rows: [] }) // values
      .mockResolvedValueOnce({ rows: [] }) // faq
      .mockResolvedValueOnce({ rows: [] }) // aiInstructions
      .mockResolvedValueOnce({ rows: [] }) // education
      .mockResolvedValueOnce({ rows: [] }); // certifications
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) delete process.env.AZURE_DATABASE_URL;
    else process.env.AZURE_DATABASE_URL = originalDatabaseUrl;
    if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
  });

  test('stores JSON-stringified object in cache when response is object', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        Promise.resolve({ ok: true, json: async () => ({ text: '{"answer":"ok"}' }) })
      );

    const context = { req: { body: { message: 'hello' } }, res: null, log: { info: jest.fn() } };
    await chatHandler(context, context.req);

    expect(context.res.status).toBe(200);
    const insertCalls = client.query.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].toLowerCase().includes('merge ai_response_cache')
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);

    delete global.fetch;
  });

  test('returns 400 when message missing', async () => {
    const context = { req: { body: {} }, res: null, log: { info: jest.fn() } };
    await chatHandler(context, context.req);
    expect(context.res.status).toBe(400);
  });
});
