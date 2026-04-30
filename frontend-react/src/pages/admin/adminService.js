import { apiRequest } from '../../lib/tanstackApi.js';

const AUTH_TIMEOUT_MS = 10000;
const PANEL_TIMEOUT_MS = 15000;
const CACHE_TIMEOUT_MS = 15000;
const SAVE_TIMEOUT_MS = 15000;

export const AUTH_API_OPTIONS = { timeoutMs: AUTH_TIMEOUT_MS, maxAttempts: 5, baseDelay: 500 };
export const PANEL_API_OPTIONS = { timeoutMs: PANEL_TIMEOUT_MS, maxAttempts: 5, baseDelay: 500 };
export const CACHE_API_OPTIONS = { timeoutMs: CACHE_TIMEOUT_MS, maxAttempts: 5, baseDelay: 500 };
export const SAVE_API_OPTIONS = { timeoutMs: SAVE_TIMEOUT_MS, maxAttempts: 5, baseDelay: 500 };

/**
 * Fetch currently authenticated user session information.
 * @returns {Promise<Response>} Fetch Response for `/api/auth/me`.
 */
export async function fetchAuthMe() {
  return apiRequest('/api/auth/me', { credentials: 'include' }, AUTH_API_OPTIONS);
}

/**
 * Fetch admin panel configuration and candidate data used to populate the UI.
 * @returns {Promise<Response>} Fetch Response for panel data.
 */
export async function fetchPanelData() {
  return apiRequest(
    '/api/panel-data',
    { method: 'GET', credentials: 'include' },
    PANEL_API_OPTIONS
  );
}

/**
 * Fetch cache/report diagnostics for admin UI cache tab.
 * @returns {Promise<Response>} Fetch Response for cache report.
 */
export async function fetchCacheReport() {
  return apiRequest(
    '/api/cache-report',
    { method: 'GET', credentials: 'include' },
    CACHE_API_OPTIONS
  );
}

/**
 * Persist admin panel data to the server.
 * @param {Object} payload - Data to save.
 * @returns {Promise<Response>} Fetch Response for save operation.
 */
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
