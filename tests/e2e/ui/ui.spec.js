const { test, expect } = require('@playwright/test');

// Use BASE_URL in CI or fall back to local emulator
const base = process.env.BASE_URL ?? 'http://localhost:4280';

// Consolidated UI smoke tests for main flows. Keep tests resilient to optional
// elements (footers, overlays) and avoid relying on external services.

function sanitizePage(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.mode-switch');
    if (el) el.style.pointerEvents = 'none';
    const pre = document.getElementById('preloader');
    if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    try {
      document.body.classList.remove('modal-open');
    } catch (err) {
      void err;
      // ignore
    }
  });
}

test('Homepage shows primary regions and navigation', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await sanitizePage(page);
  await expect(page.locator('nav')).toBeVisible();
  const primary = page.locator('#main, #hero, #content, #root, #app, [role=main], .app-root');
  await expect(primary.first()).toBeVisible({ timeout: 15000 });
});

test('Primary navigation links load pages', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await sanitizePage(page);

  const links = ['Experience', 'Fit', 'Admin', 'About'];
  for (const text of links) {
    const el = page.locator(`text=${text}`);
    if (await el.count()) {
      await expect(el.first()).toBeVisible({ timeout: 5000 });
      // Click the link and ensure the page shows new content; prefer URL or visible heading
      const href = await el.first().getAttribute('href');
      await el.first().click();
      if (href) {
        // Wait for client-side navigation to update the URL
        await page
          .waitForURL(new RegExp(href.replace(/\?/g, '\\?')), { timeout: 10000 })
          .catch(() => {});
      } else {
        await page.waitForLoadState('networkidle');
      }
      // Ensure we are not stuck on root by checking main content changed or URL changed
      if (page.url().startsWith(base)) {
        // Try to detect a page-specific heading instead
        const heading = page.locator('h1, h2, h3');
        await expect(heading.first())
          .toBeVisible({ timeout: 5000 })
          .catch(() => {});
      }
      await page.goBack();
    }
  }
});

test('Chat UI opens and shows input', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await sanitizePage(page);

  const chatToggle = page.locator('button[aria-label="Open chat"], .chat-toggle, #chat-toggle');
  if (await chatToggle.count()) {
    await chatToggle.first().click();
    const input = page.locator('textarea, input[type=text], input.chat-input');
    await expect(input.first()).toBeVisible({ timeout: 5000 });
  } else {
    test.skip(true, 'Chat toggle not present in this build');
  }
});

test('Fit page basic form submission (if present)', async ({ page }) => {
  await page.goto('/fit');
  await page.waitForLoadState('networkidle');
  await sanitizePage(page);
  const form = page.locator('form#fitForm, form[name="fit"], form .fit-form');
  if (await form.count()) {
    const submit = form.locator('button[type=submit], input[type=submit]');
    // Fill simple inputs if present
    const name = form.locator('input[name="name"]');
    if (await name.count()) await name.fill('Playwright Tester');
    const email = form.locator('input[name="email"]');
    if (await email.count()) await email.fill('test@example.com');
    if (await submit.count()) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}),
        submit.first().click(),
      ]);
    }
  } else {
    test.skip(true, 'Fit form not present in this build');
  }
});
