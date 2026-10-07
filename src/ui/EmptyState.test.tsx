import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    render(
      <EmptyState
        title="Nothing overdue"
        description="Enjoy the garden."
        action={<button>Plan week</button>}
      />,
    );
    expect(screen.getByText('Nothing overdue')).toBeInTheDocument();
    expect(screen.getByText('Enjoy the garden.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan week' })).toBeInTheDocument();
  });
});
