const { test, expect } = require('@playwright/test');

// Single smoke test to ensure /admin is served (or redirects to auth)
test('Admin route responds with 200 or redirect to login', async ({ page }) => {
  const resp = await page.goto('/admin', { waitUntil: 'networkidle' });
  if (resp) {
    const status = resp.status();
    // Accept: successful ( < 400 ) OR an auth redirect (302) or unauthorized (401)
    expect(status < 400 || status === 302 || status === 401).toBeTruthy();
  } else {
    // Fallback: ensure we were navigated to an auth flow or admin path
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url.includes('/.auth/login') || url.includes('/admin')).toBeTruthy();
  }
});
