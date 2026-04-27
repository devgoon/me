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
    client.queryWithRetry = client.query;
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

  test('stores trimmed cached response (minify string)', async () => {
    client.connect.mockResolvedValue(undefined);
    // Simulate a cache miss for getCache
    client.query
      .mockResolvedValueOnce({ rows: [] }) // getCache miss
      .mockResolvedValueOnce({ rows: [{ id: 3, name: 'Lodovico', email: 'a@b.c', title: 'Eng' }] }) // profile
      .mockResolvedValueOnce({ rows: [] }) // experiences
      .mockResolvedValueOnce({ rows: [] }) // skills
      .mockResolvedValueOnce({ rows: [] }) // gaps
      .mockResolvedValueOnce({ rows: [] }) // values
      .mockResolvedValueOnce({ rows: [] }) // faq
      .mockResolvedValueOnce({ rows: [] }) // ai_instructions
      .mockResolvedValueOnce({ rows: [] }) // education
      .mockResolvedValueOnce({}); // setCache insert

    // Make the AI return a string with extra whitespace
    global.fetch = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ ok: true, json: async () => ({ text: '   Trim me   ' }) })
      );

    const context = { res: null };
    await chatHandler(context, { method: 'POST', body: { message: 'Trim test' } });
    expect(context.res.status).toBe(200);

    // Find the MERGE call for ai_response_cache and inspect params
    const mergeCall = client.query.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('MERGE ai_response_cache')
    );
    expect(mergeCall).toBeTruthy();
    const params = mergeCall[1];
    // params: [hash, question, model, responseToStore]
    expect(params[3]).toBe('Trim me');
  });
});

// Consolidated additional chat tests
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
    client.queryWithRetry = client.query;

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

// Chat helper unit tests (merged from chat.unit.test.js and chat.cache_miss.test.js)
describe('chat helpers additional', () => {
  const chat = require('../../api/chat');
  const helpers = chat._helpers;

  test('timeoutSignal returns signal and clear', () => {
    const t = helpers.timeoutSignal(1000);
    expect(t.signal).toBeDefined();
    expect(typeof t.clear).toBe('function');
    t.clear();
  });

  test('getCache returns response and updates hit count', async () => {
    const client = { query: jest.fn() };
    client.queryWithRetry = client.query;
    client.query
      .mockResolvedValueOnce({ rows: [{ response: '  answer  ', cache_hit_count: 1 }] })
      .mockResolvedValueOnce({});

    const res = await helpers.getCache(client, 'm', 'q');
    expect(res).toBe('  answer  ');
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query.mock.calls[1][0].toLowerCase()).toContain('update ai_response_cache');
  });

  test('setCache stores trimmed string and JSON for object', async () => {
    const client = { query: jest.fn() };
    client.queryWithRetry = client.query;
    await helpers.setCache(client, 'm', 'q', '  hello  ');
    expect(client.query).toHaveBeenCalled();
    const callArgs = client.query.mock.calls[0][1];
    expect(callArgs[3]).toBe('hello');

    client.query.mockClear();
    await helpers.setCache(client, 'm', 'q', { a: 1 });
    expect(client.query).toHaveBeenCalled();
    const callArgs2 = client.query.mock.calls[0][1];
    expect(callArgs2[3]).toBe(JSON.stringify({ a: 1 }));
  });

  test('callAnthropic returns text from various response shapes', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'hello' }),
    });
    const text = await helpers.callAnthropic('sys', 'user', 'key');
    expect(text).toBe('hello');
    delete global.fetch;
  });

  test('getCache returns null when no rows', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    client.queryWithRetry = client.query;
    const res = await helpers.getCache(client, 'm', 'q');
    expect(res).toBeNull();
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
