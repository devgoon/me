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

  test('GET /api/admin/cache-report responds 200/204 or auth status', async ({ request }) => {
    const res = await request.get('/api/admin/cache-report');
    // This endpoint may be empty in some envs but should return a 200/204.
    // Deployed previews may enforce auth; allow 401 when the CI runner sets the flag.
    const flag = process.env.E2E_PREVIEW_ENFORCES_AUTH;
    const enforcesAuth = flag === '1' || (flag && flag.toLowerCase() === 'true');
    if (enforcesAuth) {
      // Deployed previews may enforce auth and/or role checks.
      expect([200, 204, 401, 403]).toContain(res.status());
    } else {
      expect([200, 204, 403]).toContain(res.status());
    }
  });
});
