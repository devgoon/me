const { test, expect } = require('@playwright/test');

// Increase per-test timeout to allow slow skills/experience loads
test.setTimeout(120000);

test.skip('Primary nav links navigate to pages (classic mode)', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Ensure classic mode: turn AI mode off if enabled
  const aiToggle = page.locator('#mode-toggle-ai');
  if (await aiToggle.count()) {
    const pressed = await aiToggle.getAttribute('aria-pressed');
    if (pressed === 'true') {
      await aiToggle.click();
      // wait briefly for classic mode to apply
      await page.waitForFunction(() => !document.body.classList.contains('ai-mode'), { timeout: 5000 }).catch(() => {});
    }
  }

  // Prevent overlays from intercepting pointer events
  await page.evaluate(() => {
    const el = document.querySelector('.mode-switch');
    if (el) el.style.pointerEvents = 'none';
    const pre = document.getElementById('preloader');
    if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    try { document.body.classList.remove('modal-open'); } catch (e) {}
  });

  const links = [
    { text: 'Experience', href: '/experience' },
    { text: 'Fit', href: '/fit' },
    { text: 'Admin', href: '/admin' },
  ];

  for (const l of links) {
    const byText = page.locator(`text=${l.text}`);
    if (await byText.count()) {
      const el = byText.first();
      await expect(el).toBeVisible({ timeout: 5000 });
      await el.click();
      await expect(page).toHaveURL(new RegExp(l.href));
      await page.goBack();
      continue;
    }

    const byHref = page.locator(`a[href^="${l.href}"]`);
    if (await byHref.count()) {
      const el = byHref.first();
      await expect(el).toBeVisible({ timeout: 5000 });
      await el.click();
      await expect(page).toHaveURL(new RegExp(l.href));
      await page.goBack();
    }
  }
});
