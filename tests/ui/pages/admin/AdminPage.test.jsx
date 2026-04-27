import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import AdminPage from '../../../../frontend-react/src/pages/AdminPage.jsx';
import { createQueryWrapper, createQueryClient } from '../../queryTestUtils.jsx';
import { renderHook } from '@testing-library/react';
import { useAdminPage } from '/frontend-react/src/pages/admin/useAdminPage.js';


// Mock the hook itself to assert AdminPage presentation independently
vi.mock('/frontend-react/src/pages/admin/useAdminPage.js', () => ({
  useAdminPage: () => ({
    loading: false,
    status: '',
    activeTab: 'profile',
    adminData: {
      profile: { fullName: 'Test User', email: 'test@example.com', currentTitle: 'Engineer', targetTitles: [] },
    },
    targetTitleInput: '',
    cacheSearch: '',
    filteredCache: [],
    setStatus: () => {},
    setAdminData: () => {},
    setTargetTitleInput: () => {},
    setCacheSearch: () => {},
    setProfileField: () => {},
    setValuesField: () => {},
    updateListItem: () => {},
    removeListItem: () => {},
    prependListItem: () => {},
    loadCacheReport: () => {},
    handleTabChange: () => {},
    save: () => {},
    defaultExperience: () => ({}),
    defaultSkill: () => ({}),
    defaultEducation: () => ({}),
    defaultCertification: () => ({}),
    defaultGap: () => ({}),
    defaultFaq: () => ({}),
    defaultRule: () => ({}),
  }),
}));

describe('AdminPage presentation', () => {
  it('renders profile fields when hook returns data', async () => {
    render(<AdminPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByLabelText('Full name')).toHaveValue('Test User');
      expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
      expect(screen.getByLabelText('Current title')).toHaveValue('Engineer');
    });
  });
});
