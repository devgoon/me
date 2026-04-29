import { apiRequest } from '../../lib/tanstackApi.js';

const AUTH_TIMEOUT_MS = 10000;
const PANEL_TIMEOUT_MS = 15000;
const CACHE_TIMEOUT_MS = 15000;
const SAVE_TIMEOUT_MS = 15000;

export const AUTH_API_OPTIONS = { timeoutMs: AUTH_TIMEOUT_MS, maxAttempts: 5, baseDelay: 500 };
export const PANEL_API_OPTIONS = { timeoutMs: PANEL_TIMEOUT_MS, maxAttempts: 5, baseDelay: 500 };
export const CACHE_API_OPTIONS = { timeoutMs: CACHE_TIMEOUT_MS, maxAttempts: 5, baseDelay: 500 };
export const SAVE_API_OPTIONS = { timeoutMs: SAVE_TIMEOUT_MS, maxAttempts: 5, baseDelay: 500 };

export async function fetchAuthMe() {
  return apiRequest('/api/auth/me', { credentials: 'include' }, AUTH_API_OPTIONS);
}

export async function fetchPanelData() {
  return apiRequest(
    '/api/panel-data',
    { method: 'GET', credentials: 'include' },
    PANEL_API_OPTIONS
  );
}

export async function fetchCacheReport() {
  return apiRequest(
    '/api/admin/cache-report',
    { method: 'GET', credentials: 'include' },
    CACHE_API_OPTIONS
  );
}

export async function savePanelData(payload) {
  return apiRequest(
    '/api/panel-data',
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    SAVE_API_OPTIONS
  );
}
