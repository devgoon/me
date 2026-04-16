const { test, expect } = require('@playwright/test');

test.describe('Basic site smoke', () => {
  test('homepage loads', async ({ page, baseURL }) => {
    // Ensure your dev server is running at the configured baseURL
    const response = await page.goto('/');
    expect(response && response.ok()).toBeTruthy();

    // Basic content checks - adapt selectors to your site
    await expect(page).toHaveTitle(/./);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
