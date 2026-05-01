import 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

// Mock the apiRequestJson used by ExperienceChips
vi.mock('../../../frontend-react/src/lib/tanstackApi.js', () => ({
  apiRequestJson: vi.fn(),
}));

import { apiRequestJson } from '../../../frontend-react/src/lib/tanstackApi.js';
import AboutPage from '../../../frontend-react/src/pages/AboutPage.jsx';

test('ExperienceChips shows unique companyName (deduplicated case-insensitive)', async () => {
  // Provide duplicate companyName entries (different casing)
  apiRequestJson.mockResolvedValueOnce({
    experiences: [
      { id: '1', companyName: 'Acme', bulletPoints: ['a'] },
      { id: '2', companyName: 'acme', bulletPoints: ['b'] },
      { id: '3', companyName: 'Beta', bulletPoints: ['c'] },
    ],
  });

  // Render AboutPage which mounts ExperienceChips
  render(<AboutPage />);

  // Wait for chips to appear and assert deduplication occurred
  await waitFor(() => {
    const acmeMatches = screen.queryAllByText(/acme/i);
    const betaMatches = screen.queryAllByText(/beta/i);
    expect(acmeMatches.length).toBe(1);
    expect(betaMatches.length).toBe(1);
  });
});
