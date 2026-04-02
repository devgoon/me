const { Client } = require('../../api/db');
/**
 * @fileoverview Tests for experience cache-related behavior.
 * @module tests/api/experience-cache.test.js
 */

const experienceHandler = require('../../api/experience/index');

jest.mock('../../api/db', () => ({ Client: jest.fn() }));

describe('experience AI cache behavior', () => {
  let client;
  const originalDatabaseUrl = process.env.AZURE_DATABASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    // Do NOT set ANTHROPIC_API_KEY so callAnthropicForContexts returns {}
    delete process.env.ANTHROPIC_API_KEY;

    client = { connect: jest.fn().mockResolvedValue(undefined), query: jest.fn(), end: jest.fn().mockResolvedValue(undefined) };
    Client.mockImplementation(() => client);
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) delete process.env.AZURE_DATABASE_URL; else process.env.AZURE_DATABASE_URL = originalDatabaseUrl;
  });

  test('does not insert empty AI responses into cache', async () => {
    // Mock DB rows in the order used by loadCandidateData
    client.query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', title: 'Eng' }] }) // profile
      .mockResolvedValueOnce({ rows: [{ id: 10, company_name: 'Acme', title: 'Dev', start_date: '2020-01-01', end_date: null, is_current: true, bullet_points: [] }] }) // experiences
      .mockResolvedValueOnce({ rows: [{ skill_name: 'Node.js', category: 'strong' }] }) // skills
      .mockResolvedValueOnce({ rows: [ { description: 'iOS', interest_in_learning: false } ] }) // gaps
      ;

    const context = { req: {}, res: null, log: { warn: jest.fn() } };
    await experienceHandler(context);

    // Ensure no INSERT into ai_response_cache was performed
    const insertCalls = client.query.mock.calls.filter(c => typeof c[0] === 'string' && c[0].includes('INSERT INTO ai_response_cache'));
    expect(insertCalls.length).toBe(0);
  });
});
