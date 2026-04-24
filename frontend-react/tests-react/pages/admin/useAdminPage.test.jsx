import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminPage } from '../../../src/pages/admin/useAdminPage.js';
import * as adminService from '../../../src/pages/admin/adminService.js';

vi.mock('../../../src/pages/admin/adminService.js', () => ({
  fetchAuthMe: vi.fn(),
  fetchCacheReport: vi.fn(),
  fetchPanelData: vi.fn(),
  savePanelData: vi.fn(),
}));

function okResponse(data) {
  return {
    ok: true,
    json: async () => data,
  };
}

describe('useAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminService.fetchAuthMe.mockResolvedValue({ ok: true });
    adminService.fetchPanelData.mockResolvedValue(okResponse({}));
    adminService.fetchCacheReport.mockResolvedValue(okResponse([]));
    adminService.savePanelData.mockResolvedValue({ ok: true });
  });

  it('loads data via auth + GET and completes loading', async () => {
    const { result } = renderHook(() => useAdminPage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(adminService.fetchAuthMe).toHaveBeenCalledTimes(1);
    expect(adminService.fetchPanelData).toHaveBeenCalledTimes(1);
  });

  it('saves sanitized admin payload and sets success status', async () => {
    const { result } = renderHook(() => useAdminPage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setProfileField('name', 'Lodo Minnocci');
      result.current.prependListItem('experiences', {
        company: 'Acme',
        role: 'Engineer',
        location: 'Remote',
        startDate: '2024-01',
        endDate: '2025-01',
        summary: 'Built features',
      });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(adminService.savePanelData).toHaveBeenCalledTimes(1);
    expect(adminService.savePanelData).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({ name: 'Lodo Minnocci' }),
      })
    );
    expect(result.current.status).toBe('Saved successfully');
  });

  it('sets save failure status when save API fails', async () => {
    adminService.savePanelData.mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useAdminPage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.save();
    });

    expect(adminService.savePanelData).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('Save failed');
  });
});
