/** @jest-environment jsdom */
/* Tests for frontend/assets/js/fetch-utils.js */

describe('fetch-utils', function () {
  const modPath = '../frontend-legacy/assets/js/fetch-utils.js';

  beforeEach(function () {
    jest.resetModules();
    // ensure a clean fetch mock each test
    global.fetch = undefined;
    // cleanup globals the module sets
    try {
      delete window.fetchWithTimeout;
      delete window.apiFetch;
    } catch (e) {}
  });

  afterEach(function () {
    jest.useRealTimers();
  });

  test('fetchWithTimeout rejects with Timeout when AbortController is unavailable', async function () {
    // Remove AbortController to force Promise.race timeout path
    const origAbort = global.AbortController;
    delete global.AbortController;
    jest.resetModules();
    require(modPath);

    // mock fetch that never resolves
    global.fetch = jest.fn(() => new Promise(() => {}));

    const p = window.fetchWithTimeout('/nope', {}, 10);
    await expect(p).rejects.toThrow(/Timeout/);

    // restore
    global.AbortController = origAbort;
  });

  test('fetchWithTimeout resolves when fetch succeeds (with AbortController available)', async function () {
    // Ensure AbortController exists so branch uses controller.signal
    if (typeof global.AbortController === 'undefined') {
      global.AbortController = class {
        constructor() {
          this.signal = {};
        }
        abort() {}
      };
    }
    jest.resetModules();
    require(modPath);

    const fakeResp = { ok: true, status: 200, json: async () => ({}) };
    global.fetch = jest.fn().mockResolvedValue(fakeResp);

    const res = await window.fetchWithTimeout('/ok', {}, 50);
    expect(res).toBe(fakeResp);
  });

  test('apiFetch retries on 5xx then succeeds', async function () {
    jest.resetModules();
    require(modPath);

    const first = { status: 503 };
    const second = { status: 200, ok: true };
    global.fetch = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    const res = await window.apiFetch(
      '/retry',
      {},
      { maxAttempts: 2, baseDelay: 1, timeoutMs: 100 }
    );
    expect(res).toBe(second);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('apiFetch throws after maxAttempts when fetch keeps failing', async function () {
    jest.resetModules();
    require(modPath);
    global.fetch = jest.fn(() => Promise.reject(new Error('net fail')));

    await expect(
      window.apiFetch('/fail', {}, { maxAttempts: 2, baseDelay: 1, timeoutMs: 50 })
    ).rejects.toThrow(/net fail/);
  });
});
