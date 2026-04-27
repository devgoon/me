import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../frontend-react/src/lib/tanstackApi.js';
import {
  fetchPanelData,
  savePanelData,
} from '../../../frontend-react/src/pages/admin/adminService.js';

vi.mock('../../../frontend-react/src/lib/tanstackApi.js', () => ({
  apiRequest: vi.fn(),
}));

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it('calls panel-data GET with credentials', async () => {
    await fetchPanelData();

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/panel-data',
      { method: 'GET', credentials: 'include' },
      { timeoutMs: 15000, maxAttempts: 5, baseDelay: 500 }
    );
  });

  it('calls panel-data save with POST and serialized payload', async () => {
    const payload = {
      profile: { name: 'Lodo' },
      experiences: [{ company: 'Acme' }],
    };

    await savePanelData(payload);

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/panel-data',
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { timeoutMs: 15000, maxAttempts: 5, baseDelay: 500 }
    );
  });
});
