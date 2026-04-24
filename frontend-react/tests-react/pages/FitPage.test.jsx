import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FitPage from '../../src/pages/FitPage.jsx';

vi.mock('../../src/lib/api.js', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../src/lib/api.js';

describe('FitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not submit when job description is empty', async () => {
    const user = userEvent.setup();

    render(<FitPage />);

    await user.click(screen.getByRole('button', { name: 'Analyze Fit' }));

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('submits and renders fit result', async () => {
    const user = userEvent.setup();
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ verdict: 'Good Match', score: 88, suggestedMessage: 'Proceed' }),
    });

    render(<FitPage />);

    await user.type(screen.getByPlaceholderText('Paste a job description'), 'A strong React role');
    await user.click(screen.getByRole('button', { name: 'Analyze Fit' }));

    await waitFor(() => {
      expect(screen.getByText('Good Match')).toBeInTheDocument();
      expect(screen.getByText(/Score:/)).toBeInTheDocument();
      expect(screen.getByText(/Recommendation:/)).toBeInTheDocument();
    });
  });
});
