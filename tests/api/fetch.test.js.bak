const { fetchWithTimeout, apiFetch } = require('../../api/fetch');

describe('api/fetch helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete global.AbortController;
    delete global.fetch;
  });

  test('fetchWithTimeout rejects when no AbortController and timeout elapses', async () => {
    // simulate environment without AbortController
    delete global.AbortController;
    global.fetch = jest.fn(() => new Promise((res) => setTimeout(() => res({ ok: true }), 200)));

    await expect(fetchWithTimeout('http://example', {}, 50)).rejects.toThrow(/Timeout/);
  });

  test('apiFetch retries on 5xx and succeeds when a later response is OK', async () => {
    let call = 0;
    global.fetch = jest.fn(() => {
      call++;
      if (call === 1) return Promise.resolve({ status: 502, ok: false });
      return Promise.resolve({ status: 200, ok: true, text: async () => 'ok' });
    });

    const res = await apiFetch(
      'http://example',
      { method: 'GET' },
      { maxAttempts: 3, baseDelay: 1, timeoutMs: 50 }
    );
    expect(res).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
