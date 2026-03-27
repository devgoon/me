const { Client } = require('../db');
const experienceHandler = require('../experience/index');

jest.mock('../db', () => ({ Client: jest.fn() }));

describe('experience API', () => {
  let client;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    client = { connect: jest.fn().mockResolvedValue(undefined), query: jest.fn(), end: jest.fn().mockResolvedValue(undefined) };
    Client.mockImplementation(() => client);
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  test('returns gaps with interestedInLearning mapped', async () => {
    // Mock DB rows in the order used by loadCandidateData
    client.query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', title: 'Eng' }] }) // profile
      .mockResolvedValueOnce({ rows: [{ id: 10, company_name: 'Acme', title: 'Dev', start_date: '2020-01-01', end_date: null, is_current: true, bullet_points: [] }] }) // experiences
      .mockResolvedValueOnce({ rows: [{ skill_name: 'Node.js', category: 'strong' }] }) // skills
      .mockResolvedValueOnce({ rows: [
        { description: 'iOS native apps', interest_in_learning: false },
        { description: 'Machine Learning Training', interest_in_learning: true }
      ] }); // gaps

    const context = { req: {}, res: null, log: { warn: jest.fn() } };
    await experienceHandler(context);

    expect(context.res.status).toBe(200);
    const gaps = context.res.body.skills.gap;
    expect(Array.isArray(gaps)).toBe(true);
    expect(gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ description: 'iOS native apps', interestedInLearning: false }),
      expect.objectContaining({ description: 'Machine Learning Training', interestedInLearning: true })
    ]));
  });
});
