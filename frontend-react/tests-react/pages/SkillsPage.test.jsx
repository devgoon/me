import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SkillsPage from '../../src/pages/SkillsPage.jsx';
import { createQueryWrapper } from '../queryTestUtils.jsx';

vi.mock('../../src/lib/tanstackApi.js', () => ({
  apiRequestJson: vi.fn(),
  tanstackRetryOptions: vi.fn(() => ({ retry: false, retryDelay: 0 })),
}));

import { apiRequestJson } from '../../src/lib/tanstackApi.js';

vi.stubGlobal('fetch', vi.fn());

describe('SkillsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the Skills page with correct heading', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
    });
    apiRequestJson.mockRejectedValueOnce(new Error('no skills'));

    render(<SkillsPage />, { wrapper: createQueryWrapper() });
    expect(screen.getByText('Skills')).toBeInTheDocument();
  });

  it('displays default strong skills', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
    });
    apiRequestJson.mockRejectedValueOnce(new Error('no skills'));

    render(<SkillsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });
  });

  it('displays default moderate skills', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
    });
    apiRequestJson.mockRejectedValueOnce(new Error('no skills'));

    render(<SkillsPage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Docker')).toBeInTheDocument();
    });
  });
});
