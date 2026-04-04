/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  document.body.innerHTML = '';
  jest.resetModules();
  // ensure localStorage is clean
  localStorage.clear();
  // Stub third-party globals used by main.js
  global.GLightbox = jest.fn();
  global.Isotope = jest.fn().mockImplementation(() => ({ arrange: jest.fn(), on: jest.fn() }));
  global.Swiper = jest.fn().mockImplementation(() => ({}));
  global.Typed = jest.fn();
  global.AOS = { init: jest.fn(), refresh: jest.fn() };
  global.PureCounter = jest.fn();
  global.Waypoint = jest.fn().mockImplementation(() => ({}));
});

test('removes #preloader on window load', () => {
  document.body.innerHTML = `<div id="preloader">loading</div>`;
  require('../../frontend/assets/js/main.js');
  // dispatch load
  window.dispatchEvent(new Event('load'));
  expect(document.getElementById('preloader')).toBeNull();
});

test('chat open/close toggles body class and aria-hidden', () => {
  document.body.innerHTML = `
    <button id="ask-ai-toggle"></button>
    <div id="ai-chat-panel" aria-hidden="true"></div>
    <div id="ai-chat-overlay" aria-hidden="true"></div>
    <button id="ai-chat-close"></button>
  `;
  require('../../frontend/assets/js/main.js');
  const toggle = document.getElementById('ask-ai-toggle');
  const panel = document.getElementById('ai-chat-panel');
  const overlay = document.getElementById('ai-chat-overlay');
  // open
  toggle.click();
  expect(document.body.classList.contains('ai-chat-open')).toBe(true);
  expect(panel.getAttribute('aria-hidden')).toBe('false');
  expect(overlay.getAttribute('aria-hidden')).toBe('false');
  // close via overlay
  overlay.click();
  expect(document.body.classList.contains('ai-chat-open')).toBe(false);
  expect(panel.getAttribute('aria-hidden')).toBe('true');
  expect(overlay.getAttribute('aria-hidden')).toBe('true');
});

test('mode toggle applies ai/traditional classes and persists to localStorage', () => {
  document.body.innerHTML = `
    <button id="mode-toggle-traditional">T</button>
    <button id="mode-toggle-ai">AI</button>
  `;
  require('../../frontend/assets/js/main.js');
  const aiBtn = document.getElementById('mode-toggle-ai');
  const tradBtn = document.getElementById('mode-toggle-traditional');
  // click AI
  aiBtn.click();
  expect(document.body.dataset.siteMode).toBe('ai');
  expect(aiBtn.getAttribute('aria-pressed')).toBe('true');
  expect(tradBtn.getAttribute('aria-pressed')).toBe('false');
  expect(localStorage.getItem('site_mode')).toBe('ai');
  // click traditional
  tradBtn.click();
  expect(document.body.dataset.siteMode).toBe('traditional');
  expect(tradBtn.getAttribute('aria-pressed')).toBe('true');
  expect(aiBtn.getAttribute('aria-pressed')).toBe('false');
  expect(localStorage.getItem('site_mode')).toBe('traditional');
});

test('sendPrompt shows timeout message when fetch aborts', async () => {
  document.body.innerHTML = `
    <div id="ai-chat-history"></div>
    <input id="ai-chat-input" />
    <button id="ai-chat-send"></button>
  `;
  // mock fetch to reject with AbortError
  global.fetch = jest.fn().mockRejectedValue({ name: 'AbortError' });
  require('../../frontend/assets/js/main.js');

  const input = document.getElementById('ai-chat-input');
  const send = document.getElementById('ai-chat-send');
  const history = document.getElementById('ai-chat-history');
  // Ensure DOMContentLoaded handlers are bound
  document.dispatchEvent(new Event('DOMContentLoaded'));
  input.value = 'Hello';
  // click to send
  send.click();
  // allow async handlers to run
  await new Promise((r) => setTimeout(r, 0));
  expect(history.textContent).toMatch(/timed out/i);
  delete global.fetch;
});
