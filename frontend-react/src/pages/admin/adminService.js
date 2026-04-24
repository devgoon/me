import { apiFetch } from '../../lib/api.js';

const AUTH_TIMEOUT_MS = 10000;
const PANEL_TIMEOUT_MS = 15000;
const CACHE_TIMEOUT_MS = 15000;
const SAVE_TIMEOUT_MS = 15000;

export async function fetchAuthMe() {
  return apiFetch('/api/auth/me', { credentials: 'include' }, { timeoutMs: AUTH_TIMEOUT_MS });
}

export async function fetchPanelData() {
  return apiFetch('/api/panel-data', { method: 'GET', credentials: 'include' }, { timeoutMs: PANEL_TIMEOUT_MS });
}

export async function fetchCacheReport() {
  return apiFetch('/api/cache-report', { method: 'GET', credentials: 'include' }, { timeoutMs: CACHE_TIMEOUT_MS });
}

export async function savePanelData(payload) {
  return apiFetch(
    '/api/panel-data',
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    { timeoutMs: SAVE_TIMEOUT_MS }
  );
}
