/**
 * Tests for the frontend fetch-utils IIFE which attaches `window.apiFetch` and `window.fetchWithTimeout`.
 */

describe('frontend fetch-utils', () => {
  let origWindow;
  beforeEach(() => {
    // create a minimal window/global environment for the IIFE
    origWindow = global.window;
    global.window = global;
    jest.resetModules();
  });

  afterEach(() => {
    // clean up
    delete global.fetch;
    global.window = origWindow;
    jest.restoreAllMocks();
  });

  test('window.apiFetch retries on 5xx then succeeds', async () => {
    // load the script which attaches apiFetch to window
    // Simulate fetch returning 5xx then 200
    let calls = 0;
    global.fetch = jest.fn(() => {
      calls++;
      if (calls === 1) return Promise.resolve({ status: 503, ok: false });
      return Promise.resolve({ status: 200, ok: true, json: async () => ({ ok: true }) });
    });

    // require the file to execute the IIFE
    require('../../frontend/assets/js/fetch-utils.js');

    expect(typeof window.apiFetch).toBe('function');

    const res = await window.apiFetch(
      '/test',
      { method: 'GET' },
      { maxAttempts: 3, baseDelay: 1, timeoutMs: 50 }
    );
    expect(res).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
