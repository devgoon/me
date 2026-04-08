/* Shared fetch utilities for frontend: timeouts, exponential backoff, retries */
(function () {
  'use strict';
  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function _fetchWithTimeout(url, opts, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    if (typeof AbortController === 'undefined') {
      return Promise.race([
        fetch(url, opts),
        new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error('Timeout'));
          }, timeoutMs);
        }),
      ]);
    }
    const controller = new AbortController();
    const id = setTimeout(function () {
      controller.abort();
    }, timeoutMs);
    return fetch(url, Object.assign({}, opts || {}, { signal: controller.signal })).finally(
      function () {
        clearTimeout(id);
      }
    );
  }

  // apiFetch: retries on network errors and 5xx responses using exponential backoff
  async function apiFetch(url, opts, options) {
    options = options || {};
    const maxAttempts = options.maxAttempts || 3;
    const baseDelay = options.baseDelay || 500;
    const timeoutMs = options.timeoutMs || 10000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await _fetchWithTimeout(url, opts, timeoutMs);
        // retry on 5xx
        if (res && res.status >= 500 && res.status < 600) {
          throw new Error('Server error ' + res.status);
        }
        return res;
      } catch (err) {
        if (attempt === maxAttempts) throw err;
        const backoff = baseDelay * Math.pow(2, attempt - 1);
        await delay(backoff);
      }
    }
  }

  // expose globals but don't overwrite if already present
  if (typeof window !== 'undefined') {
    if (!window.fetchWithTimeout) window.fetchWithTimeout = _fetchWithTimeout;
    if (!window.apiFetch) window.apiFetch = apiFetch;
  }
})();
