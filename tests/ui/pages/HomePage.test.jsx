import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomePage from '../../../frontend-react/src/pages/HomePage.jsx';
import { createQueryWrapper } from '../../queryTestUtils.jsx';

vi.mock('../../../frontend-react/src/lib/tanstackApi.js', () => ({
  apiRequestJson: vi.fn(),
  tanstackRetryOptions: vi.fn(() => ({ retry: false, retryDelay: 0 })),
}));

import { apiRequestJson } from '../../../frontend-react/src/lib/tanstackApi.js';

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders and shows health status when API succeeds', async () => {
    apiRequestJson.mockResolvedValue({ status: 'ok' });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
      { wrapper: createQueryWrapper() }
    );

    expect(screen.getByText('Lodovico (Vico) Minnocci')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('API: ok')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: "See If We're a Match" })).toHaveAttribute(
      'href',
      '/fit'
    );
  });

  it('shows fallback health status when API fails', async () => {
    apiRequestJson.mockRejectedValue(new Error('boom'));

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
      { wrapper: createQueryWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('API unavailable from this host')).toBeInTheDocument();
    });
  });
});
