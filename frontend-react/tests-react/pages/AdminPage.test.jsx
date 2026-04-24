import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from '../../src/pages/AdminPage.jsx';

vi.mock('../../src/pages/admin/useAdminPage.js', () => ({
  useAdminPage: vi.fn(),
}));

vi.mock('../../src/pages/admin/panelRegistry.jsx', () => ({
  ADMIN_PANEL_REGISTRY: {
    profile: {
      Component: () => <div>Profile Panel Content</div>,
      buildProps: () => ({}),
    },
  },
}));

import { useAdminPage } from '../../src/pages/admin/useAdminPage.js';

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    useAdminPage.mockReturnValue({ loading: true });

    render(<AdminPage />);

    expect(screen.getByText('Loading admin panel...')).toBeInTheDocument();
  });

  it('renders page content and calls handlers', async () => {
    const user = userEvent.setup();
    const handleTabChange = vi.fn();
    const save = vi.fn();

    useAdminPage.mockReturnValue({
      loading: false,
      status: 'Saved successfully',
      activeTab: 'profile',
      handleTabChange,
      save,
    });

    render(<AdminPage />);

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Profile Panel Content')).toBeInTheDocument();
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();

    await user.click(screen.getByText('Profile'));
    expect(handleTabChange).toHaveBeenCalledWith('profile');

    await user.click(screen.getByRole('button', { name: 'Save All Changes' }));
    expect(save).toHaveBeenCalledTimes(1);
  });
});
