import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExperiencePage from '../../src/pages/ExperiencePage.jsx';
import { createQueryWrapper } from '../queryTestUtils.jsx';

vi.mock('../../src/lib/tanstackApi.js', () => ({
  apiRequestJson: vi.fn(),
  tanstackRetryOptions: vi.fn(() => ({ retry: false, retryDelay: 0 })),
}));

import { apiRequestJson } from '../../src/lib/tanstackApi.js';

describe('ExperiencePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders experiences and skills from API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    apiRequestJson.mockResolvedValue({
      experiences: [
        {
          id: '1',
          companyName: 'Acme',
          title: 'Engineer',
          bulletPoints: ['Did things'],
          isCurrent: true,
        },
      ],
      skills: { strong: ['React'], moderate: ['Node'] },
    });

    render(<ExperiencePage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Acme')).toBeInTheDocument();
      expect(screen.getByText('Engineer')).toBeInTheDocument();
    });

    expect(screen.getByText('Did things')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('shows error when API experience load fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    apiRequestJson.mockRejectedValue(new Error('Unable to load experience'));

    render(<ExperiencePage />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Unable to load experience')).toBeInTheDocument();
    });
  });
});
