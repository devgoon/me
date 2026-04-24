import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../../src/lib/api.js';
import {
  fetchPanelData,
  savePanelData,
} from '../../../src/pages/admin/adminService.js';

vi.mock('../../../src/lib/api.js', () => ({
  apiFetch: vi.fn(),
}));

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it('calls panel-data GET with credentials', async () => {
    await fetchPanelData();

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/panel-data',
      { method: 'GET', credentials: 'include' },
      { timeoutMs: 15000 }
    );
  });

  it('calls panel-data save with POST and serialized payload', async () => {
    const payload = {
      profile: { name: 'Lodo' },
      experiences: [{ company: 'Acme' }],
    };

    await savePanelData(payload);

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/panel-data',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { timeoutMs: 15000 }
    );
  });
});
