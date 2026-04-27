vi.mock('../../api/db', () => ({ Client: vi.fn() }));
const { Client } = require('../../api/db');
/**
 * @fileoverview Tests for experience API endpoints.
 * @module tests/api/experience.test.js
 */

let experienceHandler;

vi.mock('../../api/db', () => ({ Client: vi.fn() }));
describe('experience API', () => {
  let client;
  const originalDatabaseUrl = process.env.AZURE_DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    client = {
      connect: vi.fn().mockResolvedValue(undefined),
      query: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
    };
    require('../../api/db').__setTestClient(client);
    client.queryWithRetry = client.query;
    experienceHandler = require('../../api/experience/index');
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) delete process.env.AZURE_DATABASE_URL;
    else process.env.AZURE_DATABASE_URL = originalDatabaseUrl;
  });

  // Consolidated experience AI cache behavior
  describe('experience AI cache behavior', () => {
    let client;
    const originalDatabaseUrl = process.env.AZURE_DATABASE_URL;

    beforeEach(() => {
      vi.clearAllMocks();
      process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      // Do NOT set ANTHROPIC_API_KEY so callAnthropicForContexts returns {}
      delete process.env.ANTHROPIC_API_KEY;

      client = {
        connect: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        end: vi.fn().mockResolvedValue(undefined),
      };
      require('../../api/db').__setTestClient(client);
      client.queryWithRetry = client.query;
    });

    afterAll(() => {
      if (originalDatabaseUrl === undefined) delete process.env.AZURE_DATABASE_URL;
      else process.env.AZURE_DATABASE_URL = originalDatabaseUrl;
    });

    test('does not insert empty AI responses into cache', async () => {
      client.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', title: 'Eng' }] }) // profile
        .mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              company_name: 'Acme',
              title: 'Dev',
              start_date: '2020-01-01',
              end_date: null,
              is_current: true,
              bullet_points: [],
            },
          ],
        }) // experiences
        .mockResolvedValueOnce({ rows: [{ skill_name: 'Node.js', category: 'strong' }] }) // skills
        .mockResolvedValueOnce({ rows: [{ description: 'iOS', interest_in_learning: false }] }); // gaps

      const context = { req: {}, res: null, log: { warn: vi.fn() } };
      await experienceHandler(context);

      const insertCalls = client.query.mock.calls.filter(
        (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO ai_response_cache')
      );
      expect(insertCalls.length).toBe(0);
    });
  });

  // Consolidated experience cache hit behavior
  describe('experience cache hit behavior', () => {
    let client;
    const originalDatabaseUrl = process.env.AZURE_DATABASE_URL;

    beforeEach(() => {
      vi.clearAllMocks();
      process.env.AZURE_DATABASE_URL = 'server://test:test@localhost:5432/test';
      client = {
        connect: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        end: vi.fn().mockResolvedValue(undefined),
      };
      require('../../api/db').__setTestClient(client);
      client.queryWithRetry = client.query;
    });

    afterAll(() => {
      if (originalDatabaseUrl === undefined) delete process.env.AZURE_DATABASE_URL;
      else process.env.AZURE_DATABASE_URL = originalDatabaseUrl;
    });

    test('uses cached aiContexts when cache hit present', async () => {
      client.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', title: 'Eng' }] }) // profile
        .mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              company_name: 'Acme',
              title: 'Dev',
              start_date: '2020-01-01',
              end_date: null,
              is_current: true,
              bullet_points: [],
            },
          ],
        }) // experiences
        .mockResolvedValueOnce({ rows: [] }) // skills
        .mockResolvedValueOnce({ rows: [] }) // gaps
        .mockResolvedValueOnce({ rows: [] }) // certifications
        .mockResolvedValueOnce({ rows: [{ hash: 'h', response: '{"10":{"situation":"cached"}}' }] }) // cacheSel
        .mockResolvedValueOnce({}); // update hit count

      const context = { req: {}, res: null };
      await experienceHandler(context);

      expect(context.res.status).toBe(200);
      const ex = context.res.body.experiences.find((e) => String(e.id) === '10' || e.id === 10);
      expect(ex).toBeTruthy();
      expect(ex.aiContext).toBeTruthy();
      expect(ex.aiContext.situation).toBe('cached');
    });
  });

  // Consolidated experience cache miss behavior
  describe('experience cache miss behavior', () => {
    let client;
    const originalDatabaseUrl = process.env.AZURE_DATABASE_URL;
    const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

    beforeEach(() => {
      vi.clearAllMocks();
      process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.ANTHROPIC_API_KEY = 'test-key';

      client = {
        connect: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        end: vi.fn().mockResolvedValue(undefined),
      };
      require('../../api/db').__setTestClient(client);
      client.queryWithRetry = client.query;

      global.fetch = vi.fn().mockResolvedValue(
        Promise.resolve({
          ok: true,
          json: async () => ({
            text: '```json {"experiences":[{"id":20,"situation":"S","approach":"A","technicalWork":"T","lessonsLearned":"L"}]} ```',
          }),
        })
      );
    });

    afterAll(() => {
      if (originalDatabaseUrl === undefined) delete process.env.AZURE_DATABASE_URL;
      else process.env.AZURE_DATABASE_URL = originalDatabaseUrl;
      if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
      delete global.fetch;
    });

    test('calls Anthropic and writes cache on miss', async () => {
      client.query
        .mockResolvedValueOnce({ rows: [{ id: 20, name: 'Test', title: 'Eng' }] }) // profile
        .mockResolvedValueOnce({
          rows: [
            {
              id: 20,
              company_name: 'Acme',
              title: 'Dev',
              start_date: '2020-01-01',
              end_date: null,
              is_current: true,
              bullet_points: [],
            },
          ],
        }) // experiences
        .mockResolvedValueOnce({ rows: [] }) // skills
        .mockResolvedValueOnce({ rows: [] }) // gaps
        .mockResolvedValueOnce({ rows: [] }) // certifications select
        .mockResolvedValueOnce({ rows: [] }); // cache select -> miss

      const context = { req: {}, res: null, log: { warn: vi.fn(), debug: vi.fn() } };
      await experienceHandler(context);

      expect(context.res.status).toBe(200);

      const insertCalls = client.query.mock.calls.filter(
        (c) =>
          typeof c[0] === 'string' && c[0].toLowerCase().includes('insert into ai_response_cache')
      );
      expect(insertCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('returns gaps with interestedInLearning mapped', async () => {
    // Mock DB rows in the order used by loadCandidateData
    client.query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', title: 'Eng' }] }) // profile
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            company_name: 'Acme',
            title: 'Dev',
            start_date: '2020-01-01',
            end_date: null,
            is_current: true,
            bullet_points: [],
          },
        ],
      }) // experiences
      .mockResolvedValueOnce({ rows: [{ skill_name: 'Node.js', category: 'strong' }] }) // skills
      .mockResolvedValueOnce({
        rows: [
          { description: 'iOS native apps', interest_in_learning: false },
          { description: 'Machine Learning Training', interest_in_learning: true },
        ],
      }); // gaps

    const context = { req: {}, res: null, log: { warn: vi.fn() } };
    await experienceHandler(context);

    expect(context.res.status).toBe(200);
    const gaps = context.res.body.skills.gap;
    expect(Array.isArray(gaps)).toBe(true);
    expect(gaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ description: 'iOS native apps', interestedInLearning: false }),
        expect.objectContaining({
          description: 'Machine Learning Training',
          interestedInLearning: true,
        }),
      ])
    );
  });
});

// Experience helper unit tests (merged from experience.unit.test.js)
describe('experience helpers', () => {
  const expModule = require('../../api/experience');
  const helpers = expModule._helpers;

  test('toIsoDate returns null or ISO date', () => {
    expect(helpers.toIsoDate(null)).toBeNull();
    expect(helpers.toIsoDate(new Date('2020-05-06T12:00:00Z'))).toBe('2020-05-06');
    expect(helpers.toIsoDate('2021-07-08T00:00:00Z')).toBe('2021-07-08');
  });

  test('textOrFallback uses fallback for empty values', () => {
    expect(helpers.textOrFallback('', 'fallback')).toBe('fallback');
    expect(helpers.textOrFallback(null, 'fb')).toBe('fb');
    expect(helpers.textOrFallback('value', 'fb')).toBe('value');
  });

  test('buildFallbackContext returns expected keys', () => {
    const exp = {};
    const fb = helpers.buildFallbackContext(exp);
    expect(fb).toHaveProperty('situation');
    expect(fb).toHaveProperty('approach');
    expect(fb).toHaveProperty('technicalWork');
    expect(fb).toHaveProperty('lessonsLearned');
  });

  test('sanitizeAiContexts maps only known experience ids', () => {
    const raw = { experiences: [{ id: '1', situation: 's' }, { id: '99' }] };
    const experiences = [{ id: 1, why_joined: 'x' }];
    const out = helpers.sanitizeAiContexts(raw, experiences);
    expect(Object.keys(out)).toContain('1');
    expect(out[1].situation).toBe('s');
  });

  test('extractJsonObject pulls JSON from fenced blocks or inline', () => {
    const t1 = '```json\n{ "a": 1 }\n```';
    expect(helpers.extractJsonObject(t1)).toEqual({ a: 1 });
    const t2 = 'some text {"b":2} trailing';
    expect(helpers.extractJsonObject(t2)).toEqual({ b: 2 });
    expect(helpers.extractJsonObject('no json here')).toBeNull();
  });

  test('coerceToArray handles strings, arrays, and objects', () => {
    expect(helpers.coerceToArray(null)).toEqual([]);
    expect(helpers.coerceToArray(['a', 'b'])).toEqual(['a', 'b']);
    expect(helpers.coerceToArray('["x","y"]')).toEqual(['x', 'y']);
    expect(helpers.coerceToArray('one, two')).toEqual(['one', 'two']);
    expect(helpers.coerceToArray({ a: 'x', b: null })).toEqual(['x', 'null']);
  });

  test('timeoutSignal returns object with signal and clear function', () => {
    const t = helpers.timeoutSignal(1000);
    expect(t).toHaveProperty('signal');
    expect(typeof t.clear).toBe('function');
    t.clear();
  });
});

// callAnthropicForContexts tests (merged from experience.callAnthropic.test.js)
describe('experience callAnthropicForContexts', () => {
  const helpers = require('../../api/experience')._helpers;

  afterEach(() => {
    delete global.fetch;
  });

  test('parses top-level text field', async () => {
    const jsonText = JSON.stringify({ experiences: [{ id: 1, situation: 'S' }] });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ text: jsonText }) });
    const res = await helpers.callAnthropicForContexts({}, [{ id: 1 }], 'key', []);
    expect(res[1]).toBeDefined();
    expect(res[1].situation).toContain('S');
  });

  test('parses content array shape', async () => {
    const jsonText = JSON.stringify({ experiences: [{ id: 1, situation: 'T' }] });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: jsonText }] }),
    });
    const res = await helpers.callAnthropicForContexts({}, [{ id: 1 }], 'key', []);
    expect(res[1]).toBeDefined();
    expect(res[1].situation).toContain('T');
  });

  test('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'err' });
    await expect(helpers.callAnthropicForContexts({}, [{ id: 1 }], 'key', [])).rejects.toThrow(
      /Anthropic API error/
    );
  });

  test('loadCandidateData throws when no profile found', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    client.queryWithRetry = client.query;
    await expect(helpers.loadCandidateData(client)).rejects.toThrow(/No candidate profile found/);
  });
});
