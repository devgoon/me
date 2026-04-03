const { Client } = require('../../api/db');
const fitHandler = require('../../api/fit/index');

jest.mock('../../api/db', () => ({ Client: jest.fn() }));

describe('fit GET behavior', () => {
  let client;
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

  test('returns profile, skills, gaps, education on GET', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [{ id: 7, name: 'X', title: 'Eng', elevator_pitch: 'hi' }] })
      .mockResolvedValueOnce({
        rows: [{ skill_name: 'JS', category: 'strong', honest_notes: '', evidence: '' }],
      })
      .mockResolvedValueOnce({ rows: [{ description: 'gap', why_its_a_gap: 'reason' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            institution: 'Uni',
            degree: 'BS',
            start_date: '2010-01-01',
            end_date: '2014-01-01',
            is_current: false,
            grade: 'A',
            notes: '',
          },
        ],
      });

    const context = { req: {}, res: null, log: { warn: jest.fn() } };
    await fitHandler(context, { method: 'GET', headers: {} });

    expect(context.res.status).toBe(200);
    expect(context.res.body.profile.name).toBe('X');
    expect(context.res.body.skills.length).toBeGreaterThan(0);
  });
});
