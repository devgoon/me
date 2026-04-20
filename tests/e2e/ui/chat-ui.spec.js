const { test, expect } = require('@playwright/test');

test.describe('Chat widget UI', () => {
  test('Open and close chat panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Ensure AI mode is enabled so AI-only controls are visible in tests
    const aiMode = page.locator('#mode-toggle-ai');
    if (await aiMode.count()) {
      const pressed = await aiMode.getAttribute('aria-pressed');
      if (pressed === 'false') {
        await aiMode.click();
        // If the experimental modal appears, confirm it to enable AI mode
        const modal = page.locator('#ai-experimental-modal');
        if (await modal.count()) {
          const confirm = page.locator('#ai-experimental-confirm');
          if (await confirm.count()) {
            await confirm.click();
            await expect(modal).toHaveAttribute('aria-hidden', 'true');
          }
        }
        // wait for page to reflect AI mode
        await page.waitForFunction(
          () => document.body && document.body.classList.contains('ai-mode')
        );
      }
    }

    const toggle = page.locator('#ask-ai-toggle');
    if (await toggle.count()) {
      await page.waitForSelector('#ask-ai-toggle', { state: 'visible', timeout: 10000 });
      await toggle.click();
      const panel = page.locator('#ai-chat-panel');
      await expect(panel).toBeVisible();
      const overlay = page.locator('#ai-chat-overlay');
      await overlay.click();
      await expect(panel).toHaveAttribute('aria-hidden', 'true');
    } else {
      test.skip(true, 'Chat toggle not present in this build');
    }
  });

  test('Send a chat message (non-destructive)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Ensure AI mode is enabled so AI-only controls are visible in tests
    const aiMode = page.locator('#mode-toggle-ai');
    if (await aiMode.count()) {
      const pressed = await aiMode.getAttribute('aria-pressed');
      if (pressed === 'false') {
        await aiMode.click();
        const modal = page.locator('#ai-experimental-modal');
        if (await modal.count()) {
          const confirm = page.locator('#ai-experimental-confirm');
          if (await confirm.count()) {
            await confirm.click();
            await expect(modal).toHaveAttribute('aria-hidden', 'true');
          }
        }
        await page.waitForFunction(
          () => document.body && document.body.classList.contains('ai-mode')
        );
      }
    }

    // Open chat if toggle exists
    const toggle = page.locator('#ask-ai-toggle');
    if (await toggle.count()) {
      await page.waitForSelector('#ask-ai-toggle', { state: 'visible', timeout: 10000 });
      await toggle.click();
    }

    const input = page.locator('#ai-chat-input');
    if (!(await input.count())) test.skip(true, 'Chat input not present');
    await expect(input).toBeVisible({ timeout: 5000 });

    await input.fill('Hello from UI test');
    const send = page.locator('#ai-chat-send');
    if (await send.count()) {
      await send.click();
    } else {
      await input.press('Enter');
    }

    const history = page.locator('#ai-chat-history');
    await expect(history).toBeVisible({ timeout: 5000 });
    await expect(history).toContainText('Hello from UI test');
  });
});
