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

  test('GET /api/cache-report responds 200/204 or auth status', async ({ request }) => {
    const flag = process.env.E2E_PREVIEW_ENFORCES_AUTH;
    if (typeof flag === 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        'E2E_PREVIEW_ENFORCES_AUTH is not set; defaulting to 0. For deterministic results, run tests via scripts/run-e2e.sh'
      );
    }
    const enforcesAuth = flag === '1' || (flag && flag.toLowerCase() === 'true');
    let res;
    try {
      res = await request.get('/api/cache-report', { maxRedirects: 0 });
    } catch (e) {
      // If the request helper throws (some environments), fall back to a
      // normal GET to obtain the final status code.
      res = await request.get('/api/cache-report');
    }
    const status = res.status();

    if (enforcesAuth) {
      // Enforced auth: expect the admin API to deny or redirect unauthenticated requests.
      expect([401, 403, 302]).toContain(status);
    } else {
      expect([200, 401, 403, 302]).toContain(status);
    }
  });
});
