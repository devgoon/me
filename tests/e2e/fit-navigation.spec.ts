import { test, expect } from '@playwright/test';

test('navigate to fit page via sidebar Assess My Fit (AI) button', async ({ page }) => {
  const base = process.env.BASE_URL ?? 'http://localhost:4280';
  await page.goto(base);
  // Wait for sidebar to load
  await page.waitForSelector('nav');
  // Click the Assess My Fit (AI) button (match by text to handle link/button variations)
  const fitButton = page.locator(`text=Assess My Fit (AI)`);
  await fitButton.first().waitFor({ state: 'visible', timeout: 10000 });
  await fitButton.first().click();
  await page.waitForURL('**/fit');
  await expect(page).toHaveURL(/.*\/fit$/);
  // Ensure heading present
  await expect(page.locator('h1')).toHaveText(/Assess Fit/);

  // Verify the chat button opens the drawer with updated label
  const chatButton = page.locator('button', { hasText: 'Ask about Me (AI)' });
  if (await chatButton.count()) {
    await chatButton.click();
    // Drawer exposes a close button with aria-label
    await expect(page.locator('button[aria-label="Close chat"]')).toBeVisible({ timeout: 5000 });
    // Close the chat
    await page.locator('button[aria-label="Close chat"]').click();
  }
});
