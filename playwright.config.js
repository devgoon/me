const { devices } = require('@playwright/test');

function getCiBranch() {
  return (
    process.env.GITHUB_REF?.replace('refs/heads/', '') ||
    process.env.GITHUB_HEAD_REF ||
    process.env.BRANCH_NAME ||
    process.env.CI_COMMIT_REF_NAME ||
    process.env.CIRCLE_BRANCH ||
    null
  );
}

function shouldUseProd(branch) {
  if (process.env.USE_PROD === '1' || process.env.USE_PROD === 'true') return true;
  if (!branch) return false;
  return branch === 'main' || branch === 'master' || branch.startsWith('release/') || branch.startsWith('hotfix/');
}

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: 'tests/e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: (() => {
    const localBase = 'http://localhost:4280';
    // Prefer `BASE_URL` for gitflow production branches; fallback to other envs
    const prodBase = process.env.BASE_URL || process.env.PROD_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || null;
    const branch = getCiBranch();
    const isProd = shouldUseProd(branch);
    return {
      baseURL: isProd ? (prodBase || localBase) : localBase,
      headless: true,
      trace: 'on-first-retry',
    };
  })(),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
};
