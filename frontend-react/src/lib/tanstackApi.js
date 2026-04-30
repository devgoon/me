/**
 * Error wrapper for non-OK HTTP responses returned by `apiRequestJson`.
 *
 * @extends Error
 */
export class ApiHttpError extends Error {
  /**
   * @param {Response} response - Fetch Response object causing the error.
   * @param {string} [message] - Optional human-friendly error message.
   */
  constructor(response, message) {
    super(message || `Request failed (${response.status})`);
    this.name = 'ApiHttpError';
    this.status = response.status;
  }
}

/**
 * Whether a numeric HTTP status should be treated as retriable.
 *
 * @param {number} status - HTTP status code.
 * @returns {boolean} True when retry is reasonable.
 */
function isRetriableStatus(status) {
  return status >= 500 || status === 408 || status === 429;
}

/**
 * Build retry options compatible with TanStack Query. The returned object
 * contains a `retry` predicate and `retryDelay` function.
 *
 * @param {Object} [apiOptions]
 * @param {number} [apiOptions.maxAttempts=5]
 * @param {number} [apiOptions.baseDelay=500]
 * @returns {{retry: function(number, Error): boolean, retryDelay: function(number): number}}
 */
export function tanstackRetryOptions(apiOptions = {}) {
  const maxAttempts = apiOptions.maxAttempts ?? 5;
  const baseDelay = apiOptions.baseDelay ?? 500;

  return {
    retry: (failureCount, error) => {
      if (failureCount >= maxAttempts) return false;
      if (error instanceof ApiHttpError) {
        return isRetriableStatus(error.status);
      }
      return true;
    },
    retryDelay: (attemptIndex) => baseDelay * 2 ** attemptIndex,
  };
}

/**
 * Attempt to extract a helpful error message from a non-JSON or JSON error
 * response. Falls back to a generic message including the HTTP status.
 *
 * @param {Response} response - Fetch response.
 * @returns {Promise<string>} Message string.
 */
async function parseErrorMessage(response) {
  try {
    const payload = await response.json();
    if (payload?.error && typeof payload.error === 'string') {
      return payload.error;
    }
  } catch {
    // Ignore JSON parse errors for non-JSON responses.
  }
  return `Request failed (${response.status})`;
}

/**
 * Fetch wrapper that supports a timeout via AbortController (when available)
 * or a Promise.race fallback.
 *
 * @param {string} url - Request URL.
 * @param {RequestInit} [requestInit={}] - Fetch init object.
 * @param {number} [timeoutMs=15000] - Timeout in milliseconds.
 * @returns {Promise<Response>} Fetch Response.
 */
async function fetchWithTimeout(url, requestInit = {}, timeoutMs = 15000) {
  if (typeof AbortController === 'undefined') {
    return Promise.race([
      fetch(url, requestInit),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeoutMs);
      }),
    ]);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const mergedInit = {
    ...requestInit,
    signal: requestInit.signal || controller.signal,
  };

  try {
    return await fetch(url, mergedInit);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Low-level API request helper that enforces a request timeout.
 *
 * @param {string} url - Endpoint URL.
 * @param {RequestInit} [requestInit={}] - Fetch init object.
 * @param {Object} [apiOptions={}] - Options; supports `timeoutMs`.
 * @returns {Promise<Response>} Fetch Response (may be non-ok).
 */
export async function apiRequest(url, requestInit = {}, apiOptions = {}) {
  // TanStack Query owns retries/backoff; this helper only handles a single timed request.
  const timeoutMs = apiOptions.timeoutMs ?? 15000;
  return fetchWithTimeout(url, requestInit, timeoutMs);
}

/**
 * Convenience variant of `apiRequest` that throws `ApiHttpError` for
 * non-2xx responses and returns the parsed JSON body for OK responses.
 *
 * @param {string} url - Endpoint URL.
 * @param {RequestInit} [requestInit={}] - Fetch init object.
 * @param {Object} [apiOptions={}] - Options; supports `timeoutMs`.
 * @returns {Promise<any>} Parsed JSON body.
 * @throws {ApiHttpError} When response.ok is false.
 */
export async function apiRequestJson(url, requestInit = {}, apiOptions = {}) {
  const response = await apiRequest(url, requestInit, apiOptions);
  if (!response.ok) {
    throw new ApiHttpError(response, await parseErrorMessage(response));
  }
  return response.json();
}
