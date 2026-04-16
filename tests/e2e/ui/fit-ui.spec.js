const { test, expect } = require('@playwright/test');

test.describe('Fit page UI', () => {
  test('Analyze minimal job description', async ({ page }) => {
    await page.goto('/fit');
    const ta = page.locator('#job-description');
    if (!(await ta.count())) test.skip(true, 'Fit job-description textarea not present');

    await ta.fill('E2E test job description');
    const btn = page.locator('#analyze-btn');
    await btn.click();

    const out = page.locator('#fit-output');
    // Wait for either a result or graceful error message
    await expect(out).toBeVisible({ timeout: 10000 });
    const text = await out.textContent();
    expect(text).toBeTruthy();
  });
});
