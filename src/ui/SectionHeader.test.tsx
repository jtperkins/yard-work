import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionHeader } from './SectionHeader';

describe('SectionHeader', () => {
  it('renders an h2 with a count', () => {
    render(<SectionHeader title="Overdue" count={4} description="Oldest first" />);
    const h = screen.getByRole('heading', { level: 2 });
    expect(h).toHaveTextContent('Overdue');
    expect(h).toHaveTextContent('4');
    expect(screen.getByText('Oldest first')).toBeInTheDocument();
  });

  it('supports h3', () => {
    render(<SectionHeader title="Suggestions" as="h3" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Suggestions' })).toBeInTheDocument();
  });
});
