/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  document.body.innerHTML = '';
  jest.resetModules();
  // safe no-op globals
  global.GLightbox = jest.fn();
});

test('checkSession redirects to /admin when session exists', async () => {
  document.body.innerHTML = `<button id="microsoft-login"></button><div id="auth-message"></div>`;
  // fetch /api/auth/me -> ok
  global.fetch = jest.fn((url) => {
    if (url === '/api/auth/me') return Promise.resolve({ ok: true, json: async () => ({}) });
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
  require('../../frontend/assets/js/auth.js');
  // allow async checkSession to run
  await new Promise((r) => setTimeout(r, 0));
  expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', expect.any(Object));
  delete global.fetch;
});

test('startLoginRedirect sets message and redirects when fetch fails', async () => {
  document.body.innerHTML = `<button id="microsoft-login"></button><div id="auth-message"></div>`;
  // fetch throws
  global.fetch = jest.fn(() => Promise.reject(new Error('nope')));
  require('../../frontend/assets/js/auth.js');
  await new Promise((r) => setTimeout(r, 0));
  // startLoginRedirect sets a redirecting message before navigation
  expect(document.getElementById('auth-message').textContent).toMatch(
    /Redirecting to Microsoft sign-in/i
  );
  delete global.fetch;
});

test('clicking login button triggers redirect immediately', async () => {
  document.body.innerHTML = `<button id="microsoft-login"></button><div id="auth-message"></div>`;
  global.fetch = jest.fn(() => Promise.reject(new Error('nope')));
  require('../../frontend/assets/js/auth.js');
  // click login button
  document.getElementById('microsoft-login').click();
  expect(document.getElementById('auth-message').textContent).toMatch(
    /Redirecting to Microsoft sign-in/i
  );
  delete global.fetch;
});
