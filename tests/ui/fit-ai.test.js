/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  document.body.innerHTML = '';
  jest.resetModules();
  // no-op globals
  global.GLightbox = jest.fn();
});

test('init builds UI and analyze alerts when JD empty', async () => {
  document.body.innerHTML = `<div id="fit-app-root"></div>`;
  global.alert = jest.fn();
  require('../../frontend/assets/js/fit-ai.js');
  // wait for init
  await new Promise((r) => setTimeout(r, 0));
  // click analyze with empty textarea should alert
  document.querySelector('#analyze-btn').click();
  expect(global.alert).toHaveBeenCalled();
  delete global.alert;
});

test('analyze posts to API and renders result on success', async () => {
  document.body.innerHTML = `<div id="fit-app-root"></div>`;
  global.fetch = jest.fn((url, opts) => {
    if (url === '/api/fit') {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          verdict: 'FIT',
          score: 8,
          suggestedMessage: 'Do X',
          mismatches: [],
          reasons: ['transfer'],
        }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
  require('../../frontend/assets/js/fit-ai.js');
  await new Promise((r) => setTimeout(r, 0));
  const ta = document.querySelector('#job-description');
  ta.value = 'Some job description with node and cloud architecture';
  document.querySelector('#analyze-btn').click();
  // wait for async fetch/render
  await new Promise((r) => setTimeout(r, 20));
  const out = document.getElementById('fit-output');
  expect(out.textContent).toMatch(/Assessment/);
  expect(out.textContent).toMatch(/FIT/);
  delete global.fetch;
});

test('copy button uses navigator.clipboard when available and reverts UI', async () => {
  document.body.innerHTML = `<div id="fit-app-root"></div>`;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      verdict: 'FIT',
      score: 9,
      suggestedMessage: 'Do X',
      mismatches: ['gap1'],
      reasons: ['r1'],
    }),
  });
  // provide clipboard
  Object.defineProperty(global.navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue() },
    configurable: true,
  });

  require('../../frontend/assets/js/fit-ai.js');
  await new Promise((r) => setTimeout(r, 0));
  document.querySelector('#job-description').value = 'jd';
  document.querySelector('#analyze-btn').click();
  await new Promise((r) => setTimeout(r, 20));

  const btn = document.querySelector('.copy-btn');
  expect(btn).toBeTruthy();
  btn.click();
  // allow promise microtasks to run and UI update
  await new Promise((r) => setTimeout(r, 0));
  // showCopied should set class and change innerHTML
  expect(btn.classList.contains('copied')).toBe(true);
  expect(btn.innerHTML).toMatch(/Copied/);
  // wait for revert timeout (1400ms)
  await new Promise((r) => setTimeout(r, 1500));
  expect(btn.classList.contains('copied')).toBe(false);
  delete global.fetch;
  delete global.navigator.clipboard;
});

test('copy button fallback uses textarea and document.execCommand', async () => {
  document.body.innerHTML = `<div id="fit-app-root"></div>`;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      verdict: 'MARGINAL',
      score: 5,
      suggestedMessage: 'Maybe',
      mismatches: [],
      reasons: [],
    }),
  });
  // remove navigator.clipboard to force fallback
  try {
    delete global.navigator.clipboard;
  } catch (e) {}
  document.execCommand = jest.fn().mockReturnValue(true);

  require('../../frontend/assets/js/fit-ai.js');
  await new Promise((r) => setTimeout(r, 0));
  document.querySelector('#job-description').value = 'jd2';
  document.querySelector('#analyze-btn').click();
  await new Promise((r) => setTimeout(r, 20));

  const btn = document.querySelector('.copy-btn');
  btn.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(document.execCommand).toHaveBeenCalled();
  expect(btn.classList.contains('copied')).toBe(true);
  await new Promise((r) => setTimeout(r, 1500));
  expect(btn.classList.contains('copied')).toBe(false);
  delete global.fetch;
  delete document.execCommand;
});

test('analyze handles API error and renders fallback Error verdict', async () => {
  document.body.innerHTML = `<div id="fit-app-root"></div>`;
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  require('../../frontend/assets/js/fit-ai.js');
  await new Promise((r) => setTimeout(r, 0));
  document.querySelector('#job-description').value = 'jd-error';
  document.querySelector('#analyze-btn').click();
  await new Promise((r) => setTimeout(r, 50));
  const out = document.getElementById('fit-output');
  expect(out.textContent).toMatch(/Fit API error/);
  delete global.fetch;
});
