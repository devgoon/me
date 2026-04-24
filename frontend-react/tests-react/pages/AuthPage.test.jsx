import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthPage from '../../src/pages/AuthPage.jsx';

vi.mock('../../src/lib/api.js', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../src/lib/api.js';

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sign in prompt when user is not authenticated', async () => {
    apiFetch.mockResolvedValue({ ok: false });

    render(<AuthPage />);

    await waitFor(() => {
      expect(screen.getByText('Sign in with Microsoft to continue.')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'Sign In With Microsoft' })).toHaveAttribute(
      'href',
      '/.auth/login/aad?post_login_redirect_uri=/admin'
    );
  });

  it('shows redirect message when user is already authenticated', async () => {
    apiFetch.mockResolvedValue({ ok: true });

    render(<AuthPage />);

    await waitFor(() => {
      expect(screen.getByText('Already signed in, redirecting to admin...')).toBeInTheDocument();
    });
  });
});
