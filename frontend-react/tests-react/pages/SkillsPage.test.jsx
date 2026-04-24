import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SkillsPage from '../../src/pages/SkillsPage.jsx';

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

    render(<SkillsPage />);
    expect(screen.getByText('Skills')).toBeInTheDocument();
  });

  it('displays default strong skills', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
    });

    render(<SkillsPage />);

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });
  });

  it('displays default moderate skills', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
    });

    render(<SkillsPage />);

    await waitFor(() => {
      expect(screen.getByText('Docker')).toBeInTheDocument();
    });
  });
});
