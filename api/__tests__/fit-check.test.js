const { Client } = require('pg');
const fitHandler = require('../fit/index');

jest.mock('pg', () => ({ Client: jest.fn() }));

describe('fit-check API', () => {
  let client;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    client = { connect: jest.fn().mockResolvedValue(undefined), query: jest.fn(), end: jest.fn().mockResolvedValue(undefined) };
    Client.mockImplementation(() => client);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ text: JSON.stringify({ score: 80, verdict: 'FIT', reasons: ['match'], mismatches: [], suggestedMessage: 'Looks good.' }) }) });
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalApiKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = originalApiKey;
  });

  test('returns 400 if jobDescription is missing', async () => {
    const context = { res: null };
    await fitHandler(context, { method: 'POST', body: {} });
    expect(context.res.status).toBe(400);
    expect(context.res.body).toEqual({ error: "Request body must include a non-empty 'jobDescription' string" });
  });

  test('returns 500 if ANTHROPIC_API_KEY missing', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    const context = { res: null };
    await fitHandler(context, { method: 'POST', body: { jobDescription: 'Test' } });
    expect(context.res.status).toBe(500);
    expect(context.res.body.error).toMatch(/ANTHROPIC_API_KEY is not configured/);
  });

  test('parses JSON returned from AI and responds with object', async () => {
    const context = { res: null };
    // Mock DB queries used by loadCandidateContext
    client.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', email: 'test@example.com', title: 'Eng' }] }) // profile
      .mockResolvedValueOnce({ rows: [] }) // experiences
      .mockResolvedValueOnce({ rows: [] }) // skills
      .mockResolvedValueOnce({ rows: [] }) // gaps
      .mockResolvedValueOnce({ rows: [] }) // values
      .mockResolvedValueOnce({ rows: [] }) // faq
      .mockResolvedValueOnce({ rows: [] }) // ai_instructions
      .mockResolvedValueOnce({ rows: [] }); // education

    await fitHandler(context, { method: 'POST', body: { jobDescription: 'Senior Engineer - AWS, React' } });
    expect(context.res.status).toBe(200);
    expect(typeof context.res.body).toBe('object');
    // AI returned JSON with score 80 in our mocked fetch
    expect(context.res.body.score).toBe(80);
  });

  test('includes skills, gaps, and education in the system prompt sent to AI', async () => {
    const context = { res: null };
    // Prepare DB rows with identifiable content
    client.query.mockResolvedValueOnce({ rows: [{ id: 2, name: 'Lodovico', email: 'vminnocci@gmail.com', title: 'Engineer' }] }) // profile
      .mockResolvedValueOnce({ rows: [] }) // experiences
      .mockResolvedValueOnce({ rows: [{ skill_name: 'Node.js', honest_notes: 'Experienced building APIs' }] }) // skills
      .mockResolvedValueOnce({ rows: [{ description: 'iOS native apps', why_its_a_gap: 'Not focused on Swift recently' }] }) // gaps
      .mockResolvedValueOnce({ rows: [] }) // values
      .mockResolvedValueOnce({ rows: [] }) // faq
      .mockResolvedValueOnce({ rows: [] }) // ai_instructions
      .mockResolvedValueOnce({ rows: [{ institution: 'Southern Connecticut State University', degree: 'MS', field_of_study: 'Computer Science' }] }); // education

    let capturedBody = null;
    global.fetch = jest.fn().mockImplementation((url, opts) => {
      capturedBody = opts && opts.body ? opts.body : null;
      return Promise.resolve({ ok: true, json: async () => ({ text: JSON.stringify({ score: 70, verdict: 'MARGINAL', reasons: [], mismatches: [], suggestedMessage: 'OK' }) }) });
    });

    await fitHandler(context, { method: 'POST', body: { jobDescription: 'Looking for Node.js backend with some iOS exposure' } });
    expect(context.res.status).toBe(200);
    expect(capturedBody).toBeTruthy();
    // system prompt should include skill, gap text, and education institution
    expect(capturedBody).toMatch(/Node\.js/i);
    expect(capturedBody).toMatch(/iOS native apps/i);
    expect(capturedBody).toMatch(/Southern Connecticut State University/i);
  });

  test('does not list equivalents in skill prompt', async () => {
    const context = { res: null };
    client.query.mockResolvedValueOnce({ rows: [{ id: 3, name: 'Test', email: 'test@example.com', title: 'Engineer' }] }) // profile
      .mockResolvedValueOnce({ rows: [] }) // experiences
      .mockResolvedValueOnce({ rows: [{ skill_name: 'Mobile Development', honest_notes: 'Built Android and iOS apps', equivalents: ['Android', 'iOS', 'React Native'] }] }) // skills
      .mockResolvedValueOnce({ rows: [] }) // gaps
      .mockResolvedValueOnce({ rows: [] }) // values
      .mockResolvedValueOnce({ rows: [] }) // faq
      .mockResolvedValueOnce({ rows: [] }) // ai_instructions
      .mockResolvedValueOnce({ rows: [] }); // education

    let capturedBody = null;
    global.fetch = jest.fn().mockImplementation((url, opts) => {
      capturedBody = opts && opts.body ? opts.body : null;
      return Promise.resolve({ ok: true, json: async () => ({ text: JSON.stringify({ score: 90, verdict: 'FIT', reasons: [], mismatches: [], suggestedMessage: 'Great fit.' }) }) });
    });

    await fitHandler(context, { method: 'POST', body: { jobDescription: 'Looking for mobile developer' } });
    expect(context.res.status).toBe(200);
    expect(capturedBody).toBeTruthy();
    expect(capturedBody).toMatch(/Mobile Development/);
    expect(capturedBody).not.toMatch(/Android/);
    expect(capturedBody).not.toMatch(/iOS/);
    expect(capturedBody).not.toMatch(/React Native/);
  });
});
