const { test, expect } = require('@playwright/test');

test.describe('API GET endpoints', () => {
  test('GET /api/health returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('ok');
  });

  test('GET /api/experience returns an array or object', async ({ request }) => {
    const res = await request.get('/api/experience');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
  });

  test('GET /api/skills returns a list', async ({ request }) => {
    const res = await request.get('/api/skills');
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Expect either array or object containing skills
    expect(body).toBeTruthy();
  });

  test('GET /api/cache-report responds 200', async ({ request }) => {
    const res = await request.get('/api/cache-report');
    // This endpoint may be empty in some envs but should return a 200/204
    expect([200, 204]).toContain(res.status());
  });
});
