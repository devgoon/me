/**
 * Server-side fetch helpers: timeouts, retries/backoff.
 * Usage: const { fetchWithTimeout, apiFetch } = require('./fetch');
 */
'use strict';
const { setTimeout: setTimeoutImpl } = require('timers');

function delay(ms) {
  return new Promise((r) => setTimeoutImpl(r, ms));
}

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
