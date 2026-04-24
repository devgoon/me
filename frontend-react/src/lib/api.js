function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 15000) {
  if (typeof AbortController === 'undefined') {
    return Promise.race([
      fetch(url, opts),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeoutMs);
      }),
    ]);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiFetch(url, opts = {}, options = {}) {
  const maxAttempts = options.maxAttempts || 5;
  const baseDelay = options.baseDelay || 500;
  const timeoutMs = options.timeoutMs || 15000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, opts, timeoutMs);
      if (response.status >= 500 && response.status < 600) {
        throw new Error(`Server error ${response.status}`);
      }
      return response;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      const backoff = baseDelay * 2 ** (attempt - 1);
      await delay(backoff);
    }
  }

  throw new Error('Unexpected fetch failure');
}
