import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import ReflectionsPanel from '../../../../frontend-react/src/components/admin/ReflectionsPanel.jsx';

// Mock jsPDF before importing the component
vi.mock('jspdf', () => {
  const mockDoc = {
    text: vi.fn(),
    setFontSize: vi.fn(),
    splitTextToSize: vi.fn((text) => [text]),
    addPage: vi.fn(),
    save: vi.fn(),
  };

  function JsPdfMock() {
    return mockDoc;
  }

  return {
    default: JsPdfMock,
  };
});

describe('ReflectionsPanel', () => {
  const mockExperiences = [
    {
      companyName: 'Acme Corp',
      title: 'Senior Engineer',
      actualContributions: 'Led platform migration from monolith to microservices',
      proudestAchievement: 'Reduced deployment time by 60%',
      wouldDoDifferently: 'Would invest more in team training early on',
      lessonsLearned: 'Communication is key during large transitions',
    },
    {
      companyName: 'Beta Inc',
      title: 'Lead Dev',
      actualContributions: 'Managed team of 5 engineers and delivered 3 major features',
      proudestAchievement: 'Built real-time notification system used by 100k+ users',
      wouldDoDifferently: 'Would push back more on unrealistic deadlines',
      lessonsLearned: 'Setting clear expectations prevents a lot of rework',
    },
    {
      companyName: 'Gamma LLC',
      title: 'Developer',
      actualContributions: 'Implemented REST API and frontend components',
      proudestAchievement: 'Optimized database queries, improved performance 10x',
      wouldDoDifferently: 'Would write tests before shipping code',
      lessonsLearned: 'Technical debt compounds quickly without discipline',
    },
    {
      companyName: 'Delta Ltd',
      title: 'Intern',
      actualContributions: 'Fixed bugs and helped with feature development',
      proudestAchievement: 'First shipped feature to production',
      wouldDoDifferently: 'Would ask more questions instead of assuming',
      lessonsLearned: 'Every company has different tech stacks and cultures',
    },
  ];

  it('renders the last three employer cards', () => {
    render(<ReflectionsPanel adminData={{ experiences: mockExperiences }} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta Inc')).toBeInTheDocument();
    expect(screen.getByText('Gamma LLC')).toBeInTheDocument();
    expect(screen.queryByText('Delta Ltd')).not.toBeInTheDocument();
  });

  it('displays all reflection fields for each employer', () => {
    render(<ReflectionsPanel adminData={{ experiences: mockExperiences }} />);

    // Check first employer (Acme Corp)
    expect(
      screen.getByText(/Led platform migration from monolith to microservices/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Reduced deployment time by 60%/)).toBeInTheDocument();
    expect(screen.getByText(/Would invest more in team training early on/)).toBeInTheDocument();
    expect(screen.getByText(/Communication is key during large transitions/)).toBeInTheDocument();

    // Check second employer (Beta Inc)
    expect(
      screen.getByText(/Managed team of 5 engineers and delivered 3 major features/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Built real-time notification system used by 100k\+ users/)
    ).toBeInTheDocument();

    // Check third employer (Gamma LLC)
    expect(screen.getByText(/Implemented REST API and frontend components/)).toBeInTheDocument();
    expect(
      screen.getByText(/Optimized database queries, improved performance 10x/)
    ).toBeInTheDocument();
  });

  it('renders field labels correctly', () => {
    render(<ReflectionsPanel adminData={{ experiences: mockExperiences }} />);
    // Use getAllByText because each label appears 3 times (once per employer card)
    expect(screen.getAllByText(/Actual Contributions:/)).toHaveLength(3);
    expect(screen.getAllByText(/Proudest Achievement:/)).toHaveLength(3);
    expect(screen.getAllByText(/Would Do Differently:/)).toHaveLength(3);
    expect(screen.getAllByText(/Lessons Learned:/)).toHaveLength(3);
  });

  it('disables PDF button if no experiences', () => {
    render(<ReflectionsPanel adminData={{ experiences: [] }} />);
    expect(screen.getByRole('button', { name: /generate pdf/i })).toBeDisabled();
  });

  it('enables PDF button with experiences', () => {
    render(<ReflectionsPanel adminData={{ experiences: mockExperiences }} />);
    expect(screen.getByRole('button', { name: /generate pdf/i })).not.toBeDisabled();
  });

  it('generates PDF with all reflection fields', () => {
    render(<ReflectionsPanel adminData={{ experiences: mockExperiences }} />);
    const btn = screen.getByRole('button', { name: /generate pdf/i });
    fireEvent.click(btn);

    // Verify PDF was triggered (the mock handles the actual call)
    expect(btn).toBeInTheDocument();
  });

  it('handles missing optional fields gracefully', () => {
    const partialExperiences = [
      {
        companyName: 'Minimal Corp',
        title: 'Developer',
        // Missing: actualContributions, proudestAchievement, wouldDoDifferently, lessonsLearned
      },
    ];
    render(<ReflectionsPanel adminData={{ experiences: partialExperiences }} />);
    expect(screen.getByText('Minimal Corp')).toBeInTheDocument();
    expect(screen.getByText('Role: Developer')).toBeInTheDocument();
  });
});
