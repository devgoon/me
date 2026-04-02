const { Client } = require('../../api/db');
/**
 * @fileoverview Tests for fit-related API behavior.
 * @module tests/api/fit-check.test.js
 */

const fitHandler = require('../../api/fit/index');

jest.mock('../../api/db', () => ({ Client: jest.fn() }));

describe('fit-check API', () => {
  let client;
  const originalDatabaseUrl = process.env.AZURE_DATABASE_URL;
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AZURE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    client = { connect: jest.fn().mockResolvedValue(undefined), query: jest.fn(), end: jest.fn().mockResolvedValue(undefined) };
    Client.mockImplementation(() => client);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ text: JSON.stringify({ score: 80, verdict: 'FIT', reasons: ['match'], mismatches: [], suggestedMessage: 'Looks good.' }) }) });
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) delete process.env.AZURE_DATABASE_URL; else process.env.AZURE_DATABASE_URL = originalDatabaseUrl;
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
      .mockResolvedValueOnce({ rows: [{ skill_name: 'Node.js', honest_notes: 'Experienced building APIs', equivalents: ['JavaScript','JS'] }] }) // skills
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
});
