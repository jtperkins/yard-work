import { render, screen } from '@testing-library/react';
import { CircleAlert } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { StatTile } from './StatTile';

describe('StatTile', () => {
  it('shows label, value and hint', () => {
    render(
      <StatTile
        label="Overdue"
        value="3"
        hint="2 high priority"
        tone="danger"
        icon={CircleAlert}
      />,
    );
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2 high priority')).toBeInTheDocument();
  });
});
