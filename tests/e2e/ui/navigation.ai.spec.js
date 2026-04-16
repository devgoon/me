const { test, expect } = require('@playwright/test');

// Increase per-test timeout to allow slow skills/experience loads
test.setTimeout(120000);

test.skip('Primary nav links navigate to pages (AI mode)', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Ensure AI mode is enabled so AI-specific nav buttons are present
  const aiToggle = page.locator('#mode-toggle-ai');
  if (await aiToggle.count()) {
    const pressed = await aiToggle.getAttribute('aria-pressed');
    if (pressed === 'false') {
      await aiToggle.click();
      // If an experimental modal appears, confirm it to enable AI mode
      const modal = page.locator('#ai-experimental-modal');
      if (await modal.count()) {
        const confirm = page.locator('#ai-experimental-confirm');
        if (await confirm.count()) {
          await confirm.click();
          await expect(modal).toHaveAttribute('aria-hidden', 'true');
        }
      }
      await page.waitForFunction(() => document.body && document.body.classList.contains('ai-mode'));
    }
  }
  // Prevent mode switch and overlays from intercepting pointer events during nav clicks
  await page.evaluate(() => {
    const el = document.querySelector('.mode-switch');
    if (el) el.style.pointerEvents = 'none';
    const pre = document.getElementById('preloader');
    if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    try { document.body.classList.remove('modal-open'); } catch (e) {}
  });
  // Try a few primary links; tolerate either text or href-based navigation
  const links = [
    // In AI mode the site shows AI chat and Fit buttons; Experience is part of classic left-nav
    { text: 'Fit', href: '/fit' },
    { text: 'Admin', href: '/admin' },
  ];

  for (const l of links) {
    // Prefer anchor href (more stable), fall back to fuzzy text match
    const byHref = page.locator(`a[href^="${l.href}"]`);
    if (await byHref.count()) {
      const el = byHref.first();
      await expect(el).toBeVisible({ timeout: 60000 });
      await el.click();
      await expect(page).toHaveURL(new RegExp(l.href));
      await page.goBack();
      continue;
    }

    const byTextFuzzy = page.locator(`text=/${l.text}/i`);
    if (await byTextFuzzy.count()) {
      const el = byTextFuzzy.first();
      await expect(el).toBeVisible({ timeout: 60000 });
      await el.click();
      await expect(page).toHaveURL(new RegExp(l.href));
      await page.goBack();
    }
  }
});
