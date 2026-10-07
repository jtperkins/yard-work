import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('keeps text in the accessibility tree with the sr-only class', () => {
    render(
      <button>
        <VisuallyHidden>Delete sign-off</VisuallyHidden>
      </button>,
    );
    expect(screen.getByRole('button', { name: 'Delete sign-off' })).toBeInTheDocument();
    expect(screen.getByText('Delete sign-off')).toHaveClass('sr-only');
  });

  it('renders a heading variant', () => {
    render(<VisuallyHidden as="h2">Filters</VisuallyHidden>);
    expect(screen.getByRole('heading', { level: 2, name: 'Filters' })).toBeInTheDocument();
  });
});
