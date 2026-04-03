const { Client } = require('../../api/db');
const { getClientPrincipal } = require('../../api/_shared/auth');
jest.mock('../../api/db', () => ({ Client: jest.fn() }));
jest.mock('../../api/_shared/auth', () => ({ getClientPrincipal: jest.fn() }));

const adminHandler = require('../../api/admin/index');

describe('admin GET mapping and helpers', () => {
  let client;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    getClientPrincipal.mockReturnValue({ email: 'admin@example.com' });
    client = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined),
    };
    Client.mockImplementation(() => client);
  });

  test('parses honesty level and quantified impact mapping', async () => {
    // resolveCandidate select -> existing id, then profileRes and rest of loadAll
    client.query
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: [{ id: 42, name: 'Tester', title: 'Engineer' }] })
      // experiencesRes: include quantified_impact as JSON string
      .mockResolvedValueOnce({
        rows: [
          {
            id: 101,
            company_name: 'Acme',
            title: 'Dev',
            start_date: '2020-01-01',
            end_date: null,
            is_current: true,
            bullet_points: ['a', 'b'],
            quantified_impact: JSON.stringify({ revenue: 1000 }),
            display_order: 0,
          },
        ],
      })
      // skillsRes
      .mockResolvedValueOnce({
        rows: [{ skill_name: 'Node.js', category: 'strong', self_rating: 5 }],
      })
      // gapsRes
      .mockResolvedValueOnce({ rows: [{ description: 'iOS', interest_in_learning: true }] })
      // educationRes
      .mockResolvedValueOnce({ rows: [] })
      // certRes (in try/catch branch)
      .mockResolvedValueOnce({ rows: [] })
      // valuesRes
      .mockResolvedValueOnce({ rows: [{}] })
      // faqRes
      .mockResolvedValueOnce({ rows: [] })
      // insRes: include HONESTY_LEVEL instruction
      .mockResolvedValueOnce({
        rows: [{ instruction: 'HONESTY_LEVEL:9', instruction_type: 'honesty', priority: 0 }],
      });

    const context = { req: {}, res: null, log: { warn: jest.fn() } };
    await adminHandler(context, { method: 'GET', headers: {} });

    expect(context.res.status).toBe(200);
    const body = context.res.body;
    expect(body.aiInstructions.honestyLevel).toBe(9);
    expect(Array.isArray(body.experiences)).toBe(true);
    expect(body.experiences[0].quantifiedImpact).toContain('revenue');
  });
});
