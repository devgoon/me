// @ts-nocheck
if (typeof require === 'function') {
  require('./fetch-utils.js');
}
/**
 * @fileoverview Authentication UI script used on the login page.
 * @module frontend/assets/js/auth.js
 */
(function () {
  const loginButton = document.getElementById('microsoft-login');
  const messageEl = document.getElementById('auth-message');
  const LOGIN_URL = '/.auth/login/aad?post_login_redirect_uri=/admin';
  let loginRedirectStarted = false;
  function setMessage(text, isError) {
    if (!messageEl) return;
    messageEl.hidden = !text;
    messageEl.textContent = text || '';
    messageEl.classList.toggle('error', Boolean(text && isError));
    messageEl.classList.toggle('ok', Boolean(text && !isError));
  }
  function startLoginRedirect() {
    if (loginRedirectStarted) return;
    loginRedirectStarted = true;
    setMessage('Redirecting to Microsoft sign-in...', false);
    // In test environments (Jest) avoid performing actual navigation which
    // jsdom does not implement; only navigate in real browsers.
    if (!(typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID)) {
      window.location.href = LOGIN_URL;
    }
  }
  async function checkSession() {
    try {
      const opts = { credentials: 'include' };
      const response = await apiFetch('/api/auth/me', opts, {
        timeoutMs: 15000,
        maxAttempts: 5,
        baseDelay: 1000,
      });
      if (response.ok) {
        if (!(typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID)) {
          window.location.href = '/admin';
        }
        return;
      }
      startLoginRedirect();
    } catch (error) {
      startLoginRedirect();
    }
  }
  if (loginButton) {
    loginButton.addEventListener('click', () => {
      startLoginRedirect();
    });
  }
  checkSession();
})();
