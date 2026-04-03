const { Client } = require('../../api/db');
const experienceHandler = require('../../api/experience/index');

jest.mock('../../api/db', () => ({ Client: jest.fn() }));

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
    // Sequence: profile, experiences, skills, gaps (from loadCandidateData), certifications, cacheSel, update hit
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
    // Expect experiences include aiContext populated from cached response
    const ex = context.res.body.experiences.find((e) => String(e.id) === '10' || e.id === 10);
    expect(ex).toBeTruthy();
    expect(ex.aiContext).toBeTruthy();
    expect(ex.aiContext.situation).toBe('cached');
  });
});
