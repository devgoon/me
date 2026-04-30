import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import { createQueryWrapper, createQueryClient } from '../../queryTestUtils.jsx';

vi.mock('/frontend-react/src/pages/admin/adminService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchAuthMe: vi.fn().mockResolvedValue({ ok: true }),
    fetchPanelData: vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          fullName: 'Integration User',
          email: 'int@example.com',
          currentTitle: 'Int Engineer',
        },
        experiences: [],
        skills: [],
        gaps: [],
        education: [],
        certifications: [],
        valuesCulture: {},
        faq: [],
        aiInstructions: { honestyLevel: 7, rules: [] },
      }),
    }),
    fetchCacheReport: vi.fn().mockResolvedValue({ ok: true, json: async () => [] }),
    savePanelData: vi.fn().mockResolvedValue({ ok: true }),
  };
});

import AdminPage from '../../../../frontend-react/src/pages/AdminPage.jsx';
import * as adminService from '/frontend-react/src/pages/admin/adminService.js';

describe('AdminPage integration', () => {
  it('bootstraps and displays data from adminService', async () => {
    const client = createQueryClient();
    const Wrapper = createQueryWrapper(client);

    render(<AdminPage />, { wrapper: Wrapper });

    // Confirm bootstrap invoked the service
    await waitFor(() => {
      expect(adminService.fetchPanelData).toHaveBeenCalled();
    });

    // Inspect the React Query cache to ensure the bootstrap query returned data
    const q = client.getQueryData(['admin', 'bootstrap']);
    expect(q).toBeTruthy();
    expect(q.data).toBeTruthy();

    // Wait for the scheduled state updates (useAdminPage uses setTimeout scheduling)
    await new Promise((r) => setTimeout(r, 0));

    // Then assert fields populated
    await waitFor(() => {
      expect(screen.getByLabelText('Full name')).toHaveValue('Integration User');
      expect(screen.getByLabelText('Email')).toHaveValue('int@example.com');
      expect(screen.getByLabelText('Current title')).toHaveValue('Int Engineer');
    });
  });
});
