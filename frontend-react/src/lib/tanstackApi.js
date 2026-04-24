export class ApiHttpError extends Error {
  constructor(response, message) {
    super(message || `Request failed (${response.status})`);
    this.name = 'ApiHttpError';
    this.status = response.status;
  }
}

function isRetriableStatus(status) {
  return status >= 500 || status === 408 || status === 429;
}

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

export async function apiRequest(url, requestInit = {}, apiOptions = {}) {
  // TanStack Query owns retries/backoff; this helper only handles a single timed request.
  const timeoutMs = apiOptions.timeoutMs ?? 15000;
  return fetchWithTimeout(url, requestInit, timeoutMs);
}

export async function apiRequestJson(url, requestInit = {}, apiOptions = {}) {
  const response = await apiRequest(url, requestInit, apiOptions);
  if (!response.ok) {
    throw new ApiHttpError(response, await parseErrorMessage(response));
  }
  return response.json();
}
