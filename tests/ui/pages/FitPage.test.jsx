import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FitPage from '../../../frontend-react/src/pages/FitPage.jsx';
import { createQueryWrapper } from '../../queryTestUtils.jsx';

vi.mock('../../../frontend-react/src/lib/tanstackApi.js', () => ({
  apiRequest: vi.fn(),
  tanstackRetryOptions: vi.fn(() => ({ retry: false, retryDelay: 0 })),
}));

import { apiRequest } from '../../../frontend-react/src/lib/tanstackApi.js';

const originalScheduleUrl = import.meta.env.VITE_SCHEDULE_MEETING_URL;

const mockFitResponse = (overrides = {}) => ({
  verdict: 'Good Match',
  score: 88,
  suggestedMessage: 'Proceed',
  mismatches: ['No Kubernetes operator experience'],
  reasons: ['Strong platform engineering background'],
  ...overrides,
});

describe('FitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    import.meta.env.VITE_SCHEDULE_MEETING_URL = '';
  });

  afterEach(() => {
    import.meta.env.VITE_SCHEDULE_MEETING_URL = originalScheduleUrl;
  });

  it('does not submit when job description is empty', async () => {
    const user = userEvent.setup();

    render(<FitPage />, { wrapper: createQueryWrapper() });

    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('shows loading state while analyzing', async () => {
    const user = userEvent.setup();
    let resolve;
    apiRequest.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );

    render(<FitPage />, { wrapper: createQueryWrapper() });

    await user.type(screen.getByPlaceholderText('Paste a job description'), 'A role');
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    expect(screen.getByRole('button', { name: 'Analyzing...' })).toBeDisabled();

    resolve({ ok: true, json: async () => mockFitResponse() });
  });

  it('shows error when API fails', async () => {
    const user = userEvent.setup();
    apiRequest.mockResolvedValue({ ok: false });

    render(<FitPage />, { wrapper: createQueryWrapper() });

    await user.type(screen.getByPlaceholderText('Paste a job description'), 'A role');
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('submits and renders all result sections', async () => {
    const user = userEvent.setup();
    apiRequest.mockResolvedValue({
      ok: true,
      json: async () => mockFitResponse(),
    });

    render(<FitPage />, { wrapper: createQueryWrapper() });

    await user.type(screen.getByPlaceholderText('Paste a job description'), 'A strong React role');
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    await waitFor(() => {
      expect(screen.getByText('Good Match')).toBeInTheDocument();
      expect(screen.getByText(/Score:/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
      expect(screen.getByText("WHERE I DON'T FIT")).toBeInTheDocument();
      expect(screen.getByText('WHAT TRANSFERS')).toBeInTheDocument();
      expect(screen.getByText('RECOMMENDATION')).toBeInTheDocument();
      expect(screen.getByText('Proceed')).toBeInTheDocument();
      expect(screen.getByText('No Kubernetes operator experience')).toBeInTheDocument();
      expect(screen.getByText('Strong platform engineering background')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Schedule a meeting' })).not.toBeInTheDocument();
    });
  });

  // Legacy normalization removed: UI strictly uses API fields `mismatches`/`reasons`.

  it('shows empty state text when gaps and transfers are empty', async () => {
    const user = userEvent.setup();
    apiRequest.mockResolvedValue({
      ok: true,
      json: async () => mockFitResponse({ mismatches: [], reasons: [] }),
    });

    render(<FitPage />, { wrapper: createQueryWrapper() });

    await user.type(screen.getByPlaceholderText('Paste a job description'), 'A role');
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    await waitFor(() => {
      expect(screen.getByText('No JD-specific gaps identified.')).toBeInTheDocument();
      expect(screen.getByText('No direct transfer highlights found.')).toBeInTheDocument();
    });
  });

  it('shows schedule meeting link when verdict is FIT', async () => {
    import.meta.env.VITE_SCHEDULE_MEETING_URL = 'https://calendar.app.google/test-schedule';
    const user = userEvent.setup();
    apiRequest.mockResolvedValue({
      ok: true,
      json: async () => mockFitResponse({ verdict: 'FIT', score: 92 }),
    });

    render(<FitPage />, { wrapper: createQueryWrapper() });

    await user.type(screen.getByPlaceholderText('Paste a job description'), 'A strong role');
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    await waitFor(() => {
      const scheduleLink = screen.getByRole('link', { name: 'Schedule a meeting' });
      expect(scheduleLink).toBeInTheDocument();
      expect(scheduleLink).toHaveAttribute('href', 'https://calendar.app.google/test-schedule');
    });
  });

  it('does not show schedule meeting link for MARGINAL verdict', async () => {
    import.meta.env.VITE_SCHEDULE_MEETING_URL = 'https://calendar.app.google/test-schedule';
    const user = userEvent.setup();
    apiRequest.mockResolvedValue({
      ok: true,
      json: async () => mockFitResponse({ verdict: 'MARGINAL', score: 71 }),
    });

    render(<FitPage />, { wrapper: createQueryWrapper() });

    await user.type(
      screen.getByPlaceholderText('Paste a job description'),
      'A role with partial overlap'
    );
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    await waitFor(() => {
      expect(screen.getByText('MARGINAL')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Schedule a meeting' })).not.toBeInTheDocument();
    });
  });

  it('does not show schedule meeting link when schedule URL is not configured', async () => {
    import.meta.env.VITE_SCHEDULE_MEETING_URL = '';
    const user = userEvent.setup();
    apiRequest.mockResolvedValue({
      ok: true,
      json: async () => mockFitResponse({ verdict: 'FIT' }),
    });

    render(<FitPage />, { wrapper: createQueryWrapper() });

    await user.type(screen.getByPlaceholderText('Paste a job description'), 'A role');
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    await waitFor(() => {
      expect(screen.getByText('FIT')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Schedule a meeting' })).not.toBeInTheDocument();
    });
  });

  it('re-renders schedule meeting link after a subsequent FIT verdict', async () => {
    import.meta.env.VITE_SCHEDULE_MEETING_URL = 'https://calendar.app.google/test-schedule';
    const user = userEvent.setup();

    // First response: MARGINAL
    // Second response: FIT
    apiRequest.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFitResponse({ verdict: 'MARGINAL', score: 71 }),
    });
    apiRequest.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFitResponse({ verdict: 'FIT', score: 92 }),
    });

    render(<FitPage />, { wrapper: createQueryWrapper() });

    // First analysis
    await user.type(
      screen.getByPlaceholderText('Paste a job description'),
      'A role with partial overlap'
    );
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    await waitFor(() => {
      expect(screen.getByText('MARGINAL')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Schedule a meeting' })).not.toBeInTheDocument();
    });

    // Prepare second input and run again
    await user.clear(screen.getByPlaceholderText('Paste a job description'));
    await user.type(screen.getByPlaceholderText('Paste a job description'), 'A strong role');
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    await waitFor(() => {
      const scheduleLink = screen.getByRole('link', { name: 'Schedule a meeting' });
      expect(scheduleLink).toBeInTheDocument();
      expect(scheduleLink).toHaveAttribute('href', 'https://calendar.app.google/test-schedule');
    });
  });

  it('shows FOLLOW-UP heading when verdict is FIT', async () => {
    import.meta.env.VITE_SCHEDULE_MEETING_URL = '';
    const user = userEvent.setup();
    apiRequest.mockResolvedValue({
      ok: true,
      json: async () => mockFitResponse({ verdict: 'FIT' }),
    });

    render(<FitPage />, { wrapper: createQueryWrapper() });

    await user.type(screen.getByPlaceholderText('Paste a job description'), 'A role');
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    await waitFor(() => {
      expect(screen.getByText('FOLLOW-UP')).toBeInTheDocument();
    });
  });

  it('shows NEXT STEPS heading when verdict is MARGINAL', async () => {
    import.meta.env.VITE_SCHEDULE_MEETING_URL = '';
    const user = userEvent.setup();
    apiRequest.mockResolvedValue({
      ok: true,
      json: async () => mockFitResponse({ verdict: 'MARGINAL' }),
    });

    render(<FitPage />, { wrapper: createQueryWrapper() });

    await user.type(screen.getByPlaceholderText('Paste a job description'), 'A role');
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    await waitFor(() => {
      expect(screen.getByText('NEXT STEPS')).toBeInTheDocument();
    });
  });

  it('shows RECOMMENDATION heading for non-FIT/MARGINAL verdicts', async () => {
    import.meta.env.VITE_SCHEDULE_MEETING_URL = '';
    const user = userEvent.setup();
    apiRequest.mockResolvedValue({
      ok: true,
      json: async () => mockFitResponse({ verdict: 'NO FIT' }),
    });

    render(<FitPage />, { wrapper: createQueryWrapper() });

    await user.type(screen.getByPlaceholderText('Paste a job description'), 'A role');
    await user.click(screen.getByRole('button', { name: 'JD Fit Check' }));

    await waitFor(() => {
      expect(screen.getByText('RECOMMENDATION')).toBeInTheDocument();
    });
  });
});
