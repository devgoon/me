/**
 * Server-side fetch helpers: timeouts, retries/backoff.
 * Usage: const { fetchWithTimeout, apiFetch } = require('./fetch');
 */
'use strict';
const { setTimeout: setTimeoutImpl } = require('timers');

/**
 * Simple delay helper returning a Promise that resolves after `ms`.
 *
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((r) => setTimeoutImpl(r, ms));
}

/**
 * Fetch wrapper providing a request timeout. Uses AbortController when
 * available, otherwise falls back to a Promise.race with a setTimeout.
 *
 * @param {string} url - Request URL.
 * @param {RequestInit} [opts] - Fetch options.
 * @param {number} [timeoutMs=10000] - Timeout in milliseconds.
 * @returns {Promise<Response>} Fetch Response.
 */
async function fetchWithTimeout(url, opts, timeoutMs) {
  timeoutMs = timeoutMs || 10000;
  if (typeof AbortController === 'undefined') {
    return Promise.race([
      fetch(url, opts),
      new Promise(function (resolve, reject) {
        setTimeoutImpl(function () {
          reject(new Error('Timeout'));
        }, timeoutMs);
      }),
    ]);
  }
  const controller = new AbortController();
  const id = setTimeoutImpl(function () {
    controller.abort();
  }, timeoutMs);
  try {
    const res = await fetch(url, Object.assign({}, opts || {}, { signal: controller.signal }));
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Robust server-side fetch with retry/backoff for transient failures.
 *
 * @param {string} url - Request URL.
 * @param {RequestInit} [opts] - Fetch options.
 * @param {{maxAttempts?: number, baseDelay?: number, timeoutMs?: number}} [options]
 * @returns {Promise<Response>} Fetch Response.
 */
async function apiFetch(url, opts, options) {
  options = options || {};
  const maxAttempts = options.maxAttempts || 3;
  const baseDelay = options.baseDelay || 500;
  const timeoutMs = options.timeoutMs || 20000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(url, opts, timeoutMs);
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

module.exports = { fetchWithTimeout, apiFetch };
