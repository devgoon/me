vi.mock('../../api/db', () => ({ Client: vi.fn() }));
const { Client } = require('../../api/db');
/**
 * @fileoverview Tests for skills API.
 * @module tests/api/skills.test.js
 */
let skillsHandler;

vi.mock('../../api/db', () => ({ Client: vi.fn() }));
describe('skills API', () => {
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
    skillsHandler = require('../../api/skills/index');
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) delete process.env.AZURE_DATABASE_URL;
    else process.env.AZURE_DATABASE_URL = originalDatabaseUrl;
  });

  test('returns strong and moderate skills grouped correctly', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // profile
      .mockResolvedValueOnce({
        rows: [
          { id: 10, skill_name: 'JavaScript', category: 'strong' },
          { id: 11, skill_name: 'React', category: 'moderate' },
        ],
      }); // skills

    const context = { req: {}, res: null, log: { warn: vi.fn() } };
    await skillsHandler(context);

    expect(context.res.status).toBe(200);
    expect(context.res.body.skills).toBeDefined();
    expect(Array.isArray(context.res.body.skills.strong)).toBe(true);
    expect(Array.isArray(context.res.body.skills.moderate)).toBe(true);
    expect(context.res.body.skills.strong).toEqual(expect.arrayContaining(['JavaScript']));
    expect(context.res.body.skills.moderate).toEqual(expect.arrayContaining(['React']));
  });
});
