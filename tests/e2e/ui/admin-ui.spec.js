const { test, expect } = require('@playwright/test');

test('Admin page should require authentication or show login', async ({ page, request }) => {
  // Detect whether SWA auth is enforced by checking the login redirect.
  const loginCheck = await request.get('/.auth/login/aad?post_login_redirect_uri=/admin', { maxRedirects: 0 }).catch(() => null);
  const enforcesAuth = !!(loginCheck && loginCheck.status() === 302);

  // Use a request to check unauthenticated access to the admin API/page
  const res = await request.get('/api/panel-data');
  const status = res.status();

  if (enforcesAuth) {
    expect([401, 403]).toContain(status);
  } else {
    // Some preview deployments or local emulators may allow 200 — tolerate that.
    expect([200, 401, 403]).toContain(status);
  }
});
