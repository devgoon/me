const { test, expect } = require('@playwright/test');

test.describe('Auth & Admin safety checks', () => {
  test('Unauthenticated admin API returns 401/403', async ({ request }) => {
    // `panel-data` is the admin API used by the admin UI
    const res = await request.get('/api/panel-data');
    const status = res.status();
    // When running against a deployed host (BASE_URL or HOST present) we expect the API
    // to deny unauthenticated access (401 or 403). The local emulator may return 200
    // for convenience, so allow 200 locally.
    const isDeployed = !!(process.env.BASE_URL || process.env.HOST);
    if (isDeployed) {
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
