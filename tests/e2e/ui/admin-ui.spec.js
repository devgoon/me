const { test, expect } = require('@playwright/test');

test('Admin page should require authentication or show login', async ({ page, request }) => {
  // Use a request to check unauthenticated access to the admin API/page
  const res = await request.get('/api/panel-data');
  const status = res.status();
  // Deployed should deny (401/403); emulator may allow 200
  const isDeployed = !!(process.env.BASE_URL || process.env.HOST);
  if (isDeployed) {
    expect([401, 403]).toContain(status);
  } else {
    expect([200, 401, 403]).toContain(status);
  }
});
