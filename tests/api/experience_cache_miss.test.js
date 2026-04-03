const { Client } = require('../../api/db');
const experienceHandler = require('../../api/experience/index');

jest.mock('../../api/db', () => ({ Client: jest.fn() }));

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
          // return JSON wrapped in fenced block so extractJsonObject can parse it
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
    // Sequence for loadCandidateData: profile, experiences, skills, gaps
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
