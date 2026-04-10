/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  document.body.innerHTML = '';
  jest.resetModules();
  // Clear any previous global fetch/apiFetch
  delete global.fetch;
  delete global.apiFetch;
  // Stub third-party globals used by main.js and other frontend scripts
  global.GLightbox = jest.fn();
  global.Isotope = jest.fn().mockImplementation(() => ({ arrange: jest.fn(), on: jest.fn() }));
  global.Swiper = jest.fn().mockImplementation(() => ({}));
  global.Typed = jest.fn();
  global.AOS = { init: jest.fn(), refresh: jest.fn() };
  global.PureCounter = jest.fn();
  global.Waypoint = jest.fn().mockImplementation(() => ({}));
});

test('main.js uses apiFetch when available for chat calls', async () => {
  document.body.innerHTML = `
    <div id="ai-chat-history"></div>
    <input id="ai-chat-input" />
    <button id="ai-chat-send"></button>
  `;

  global.apiFetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ response: 'ok' }) });

  require('../../frontend/assets/js/main.js');
  // Ensure DOMContentLoaded handlers are bound
  document.dispatchEvent(new Event('DOMContentLoaded'));

  const input = document.getElementById('ai-chat-input');
  const send = document.getElementById('ai-chat-send');
  input.value = 'Hello';
  send.click();

  // allow async handlers to run
  await new Promise((r) => setTimeout(r, 0));
  expect(global.apiFetch).toHaveBeenCalled();
  delete global.apiFetch;
});

test('experience-ai uses apiFetch for loading data', async () => {
  document.body.innerHTML = `
    <div id="experience-list"></div>
    <div id="skills-list"></div>
    <div id="experience-error" hidden></div>
  `;

  global.apiFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ experiences: [], skills: { strong: [], moderate: [] } }),
  });

  require('../../frontend/assets/js/experience-ai.js');
  // allow async handlers to run
  await new Promise((r) => setTimeout(r, 0));
  expect(global.apiFetch).toHaveBeenCalled();
  delete global.apiFetch;
});

test('fit-ai uses apiFetch when analyzing job descriptions', async () => {
  // fit-ai builds the DOM elements itself; require and then interact
  document.body.innerHTML = `<div id="fit-app-root"></div>`;
  global.apiFetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ verdict: 'FIT', score: 9 }) });

  require('../../frontend/assets/js/fit-ai.js');
  // allow init to run
  await new Promise((r) => setTimeout(r, 0));
  const textarea = document.getElementById('job-description');
  const btn = document.getElementById('analyze-btn');
  textarea.value = 'some job description';
  btn.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(global.apiFetch).toHaveBeenCalled();
  delete global.apiFetch;
});

test('auth.js prefers apiFetch when checking session', async () => {
  document.body.innerHTML = '';
  global.apiFetch = jest.fn().mockResolvedValue({ ok: false });

  require('../../frontend/assets/js/auth.js');
  // allow async checkSession to run
  await new Promise((r) => setTimeout(r, 0));
  expect(global.apiFetch).toHaveBeenCalled();
  delete global.apiFetch;
});
