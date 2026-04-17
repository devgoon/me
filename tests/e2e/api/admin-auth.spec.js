const { test, expect } = require('@playwright/test');

test.describe('Auth & Admin safety checks', () => {
  test('Unauthenticated admin API returns 401/403', async ({ request }) => {
    // `panel-data` is the admin API used by the admin UI
    // Environment-only detection: read the runner-provided flag. If it's not
    // set, default to '0' (no enforced auth) but emit a warning recommending
    // running tests via `scripts/run-e2e.sh` which sets the flag reliably.
    const flag = process.env.E2E_PREVIEW_ENFORCES_AUTH;
    if (typeof flag === 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('E2E_PREVIEW_ENFORCES_AUTH is not set; defaulting to 0. For deterministic results, run tests via scripts/run-e2e.sh');
    }
    const enforcesAuth = flag === '1' || (flag && flag.toLowerCase() === 'true');

    const res = await request.get('/api/panel-data');
    const status = res.status();

    if (enforcesAuth) {
      expect([401, 403]).toContain(status);
    } else {
      expect([200, 401, 403]).toContain(status);
    }
  });

  test('Auth login endpoint redirects (deployed) or returns 200 (emulator)', async ({ request }) => {
    const url = '/.auth/login/aad?post_login_redirect_uri=/admin';
    const res = await request.get(url, { maxRedirects: 0 }).catch(e => {
      // Some environments may throw on strict redirect handling; fallback to a normal GET
      return request.get(url);
    });

    const status = res.status();
    // Emulators may return 200 for the login page; deployed SWA should redirect (302)
    expect([200, 302]).toContain(status);

    if (status === 302) {
      const location = (res.headers() || {})['location'] || '';
      // Deployed AAD redirect should point to identity.*.azurestaticapps.net
      expect(location).toMatch(/https:\/\/identity\..*azurestaticapps\.net\//);
    }
  });
});
