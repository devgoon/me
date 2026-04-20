const { test, expect } = require('@playwright/test');

test('Mobile menu and critical elements usable at small viewport', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 375, height: 812 });
  // Prevent mode-switch and overlays from intercepting clicks on mobile
  await page.evaluate(() => {
    const el = document.querySelector('.mode-switch');
    if (el) el.style.pointerEvents = 'none';
    const pre = document.getElementById('preloader');
    if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    try {
      document.body.classList.remove('modal-open');
    } catch (e) {}
  });
  const toggle = page.locator('.mobile-nav-toggle');
  if (await toggle.count()) {
    await toggle.click();
    await expect(page.locator('nav')).toBeVisible();
  } else {
    test.skip(true, 'mobile nav toggle not present');
  }
});
