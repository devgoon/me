const { Client } = require('../../api/db');
/**
 * @fileoverview Tests for chat API endpoints.
 * @module tests/api/chat.test.js
 */
const chatHandler = require('../../api/chat/index');

jest.mock('../../api/db', () => ({
  Client: jest.fn(),
}));

describe('chat API', () => {
  let client;
  const originalDatabaseUrl = process.env.AZURE_DATABASE_URL;
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

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
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.AZURE_DATABASE_URL;
    } else {
      process.env.AZURE_DATABASE_URL = originalDatabaseUrl;
    }
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  });

  test('returns 400 if message is missing', async () => {
    const context = { res: null };
    await chatHandler(context, { method: 'POST', body: {} });
    expect(context.res.status).toBe(400);
    expect(context.res.body).toEqual({
      error: "Request body must include a non-empty 'message' string",
    });
  });

  test('returns 500 if API key is missing', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    const context = { res: null };
    await chatHandler(context, { method: 'POST', body: { message: 'Hello' } });
    expect(context.res.status).toBe(500);
    expect(context.res.body.error).toMatch(/ANTHROPIC_API_KEY is not configured/);
  });

  test('returns 500 if database URL is missing', async () => {
    process.env.AZURE_DATABASE_URL = '';
    const context = { res: null };
    await chatHandler(context, { method: 'POST', body: { message: 'Hello' } });
    expect(context.res.status).toBe(500);
    expect(context.res.body.error).toMatch(/AZURE_DATABASE_URL is not configured/);
  });

  test('returns cached response if available', async () => {
    process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    client.connect.mockResolvedValue(undefined);
    client.query
      .mockResolvedValueOnce({ rows: [{ response: 'Cached answer', cache_hit_count: 1 }] }) // getCache
      .mockResolvedValueOnce({}); // update cache_hit_count
    const context = { res: null };
    await chatHandler(context, { method: 'POST', body: { message: 'What is AI?' } });
    expect(context.res.status).toBe(200);
    expect(context.res.body.response).toBe('Cached answer');
  });

  test('includes equivalents in system prompt sent to AI', async () => {
    client.connect.mockResolvedValue(undefined);
    // profile, experiences, skills, gaps, values, faq, ai_instructions, education
    client.query
      .mockResolvedValueOnce({ rows: [] }) // cache miss
      .mockResolvedValueOnce({
        rows: [{ id: 3, name: 'Lodovico', email: 'vminnocci@gmail.com', title: 'Engineer' }],
      }) // profile
      .mockResolvedValueOnce({ rows: [] }) // experiences
      .mockResolvedValueOnce({
        rows: [
          {
            skill_name: 'Node.js',
            honest_notes: 'APIs',
            equivalents: ['JavaScript', 'JS'],
            category: 'strong',
          },
        ],
      }) // skills
      .mockResolvedValueOnce({ rows: [] }) // gaps
      .mockResolvedValueOnce({ rows: [] }) // values
      .mockResolvedValueOnce({ rows: [] }) // faq
      .mockResolvedValueOnce({ rows: [] }) // ai_instructions
      .mockResolvedValueOnce({ rows: [] }) // education
      .mockResolvedValueOnce({}); // insert cache (setCache)

    let capturedBody = null;
    global.fetch = jest.fn().mockImplementation((url, opts) => {
      capturedBody = opts && opts.body ? opts.body : null;
      return Promise.resolve({ ok: true, json: async () => ({ text: 'OK' }) });
    });

    const context = { res: null };
    await chatHandler(context, { method: 'POST', body: { message: 'Hello' } });
    expect(context.res.status).toBe(200);
    expect(capturedBody).toBeTruthy();
    expect(capturedBody).toMatch(/JavaScript|JS/);
  });
});
