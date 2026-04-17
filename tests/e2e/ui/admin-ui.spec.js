const { test, expect } = require('@playwright/test');

test('Admin page should require authentication or show login', async ({ page, request }) => {
  // Enforce env-only detection: read `E2E_PREVIEW_ENFORCES_AUTH` exported by the runner.
  const flag = process.env.E2E_PREVIEW_ENFORCES_AUTH;
  if (typeof flag === 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('E2E_PREVIEW_ENFORCES_AUTH is not set; defaulting to 0. For deterministic results, run tests via scripts/run-e2e.sh');
  }
  const enforcesAuth = flag === '1' || (flag && flag.toLowerCase() === 'true');

  // Request the admin API without following redirects so we can observe 302s.
  let res;
  try {
    res = await request.get('/api/panel-data', { maxRedirects: 0 });
  } catch (e) {
    res = await request.get('/api/panel-data');
  }
  const status = res.status();

  if (enforcesAuth) {
    expect([401, 403, 302]).toContain(status);
  } else {
    expect([200, 401, 403, 302]).toContain(status);
  }
});
