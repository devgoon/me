import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomePage from '../../src/pages/HomePage.jsx';

vi.mock('../../src/lib/api.js', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../src/lib/api.js';

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and shows health status when API succeeds', async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Lodovico (Vico) Minnocci')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('API: ok')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: 'See if we are a match' })).toHaveAttribute('href', '/fit');
  });

  it('shows fallback health status when API fails', async () => {
    apiFetch.mockRejectedValue(new Error('boom'));

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('API unavailable from this host')).toBeInTheDocument();
    });
  });
});
