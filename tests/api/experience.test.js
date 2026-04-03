const { Client } = require('../../api/db');
/**
 * @fileoverview Tests for experience API endpoints.
 * @module tests/api/experience.test.js
 */

const experienceHandler = require('../../api/experience/index');

jest.mock('../../api/db', () => ({ Client: jest.fn() }));

describe('experience API', () => {
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

  // Consolidated experience AI cache behavior
  describe('experience AI cache behavior', () => {
    let client;
    const originalDatabaseUrl = process.env.AZURE_DATABASE_URL;

    beforeEach(() => {
      jest.clearAllMocks();
      process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      // Do NOT set ANTHROPIC_API_KEY so callAnthropicForContexts returns {}
      delete process.env.ANTHROPIC_API_KEY;

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

      const context = { req: {}, res: null, log: { warn: jest.fn() } };
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
      jest.clearAllMocks();
      process.env.AZURE_DATABASE_URL = 'server://test:test@localhost:5432/test';
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
      jest.clearAllMocks();
      process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.ANTHROPIC_API_KEY = 'test-key';

      client = {
        connect: jest.fn().mockResolvedValue(undefined),
        query: jest.fn(),
        end: jest.fn().mockResolvedValue(undefined),
      };
      Client.mockImplementation(() => client);

      global.fetch = jest.fn().mockResolvedValue(
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

      const context = { req: {}, res: null, log: { warn: jest.fn(), debug: jest.fn() } };
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

    const context = { req: {}, res: null, log: { warn: jest.fn() } };
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
