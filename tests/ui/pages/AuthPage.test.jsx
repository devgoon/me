import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthPage from '../../../frontend-react/src/pages/AuthPage.jsx';
import { createQueryWrapper } from '../../queryTestUtils.jsx';

vi.mock('../../../frontend-react/src/lib/tanstackApi.js', () => ({
  apiRequest: vi.fn(),
  tanstackRetryOptions: vi.fn(() => ({ retry: false, retryDelay: 0 })),
}));

import { apiRequest } from '../../../frontend-react/src/lib/tanstackApi.js';

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign in prompt when user is not authenticated', async () => {
    apiRequest.mockResolvedValue({ ok: false });

    render(<AuthPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Sign in with Microsoft to continue.')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Sign In With Microsoft' })).toHaveAttribute(
      'href',
      '/.auth/login/aad?post_login_redirect_uri=/admin'
    );
  });

  it('shows redirect message when user is already authenticated', async () => {
    apiRequest.mockResolvedValue({ ok: true });

    render(<AuthPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Already signed in, redirecting to admin...')).toBeInTheDocument();
    });
  });
});
