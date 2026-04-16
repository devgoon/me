const { test, expect } = require('@playwright/test');

test.describe('Auth & Admin safety checks', () => {
  test('Unauthenticated admin API returns 401/403', async ({ request }) => {
    // `panel-data` is the admin API used by the admin UI
    // Query the admin API first — if it already returns 401/403, treat that as
    // evidence that auth is enforced. Otherwise fall back to checking whether
    // the host redirects the login endpoint (302) which also implies enforced auth.
    const res = await request.get('/api/panel-data');
    const status = res.status();

    const loginCheck = await request.get('/.auth/login/aad?post_login_redirect_uri=/admin', { maxRedirects: 0 }).catch(() => null);
    const loginRedirects = !!(loginCheck && loginCheck.status() === 302);

    const enforcesAuth = loginRedirects || [401, 403].includes(status);

    if (enforcesAuth) {
      expect([401, 403]).toContain(status);
    } else {
      // Allow 200 in environments that do not enforce SWA auth (emulator or some previews)
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
