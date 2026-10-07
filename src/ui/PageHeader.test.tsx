import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders an h1 with eyebrow, description, actions and back slot', () => {
    render(
      <PageHeader
        title="Board"
        eyebrow="Wednesday, Oct 7"
        description="What needs doing"
        actions={<button>Plan</button>}
        back={<a href="/">Back</a>}
        meta={<span>chip</span>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Board' })).toBeInTheDocument();
    expect(screen.getByText('Wednesday, Oct 7')).toBeInTheDocument();
    expect(screen.getByText('What needs doing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByText('chip')).toBeInTheDocument();
  });
});
