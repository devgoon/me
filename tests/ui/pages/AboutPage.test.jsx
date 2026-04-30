import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AboutPage from '../../../frontend-react/src/pages/AboutPage.jsx';

describe('AboutPage', () => {
  it('renders the About page with correct heading', () => {
    render(<AboutPage />);
    expect(screen.getByText('Lodovico (Vico) Minnocci')).toBeInTheDocument();
  });

  it('displays about content and contact info', () => {
    render(<AboutPage />);
    expect(screen.getByText(/Cloud Architect & Developer/)).toBeInTheDocument();
    expect(screen.getByText(/vminnocci@gmail.com/)).toBeInTheDocument();
  });
});
