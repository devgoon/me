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
