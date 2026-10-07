import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardFooter, CardHeader } from './Card';

describe('Card', () => {
  it('renders children in the chosen element', () => {
    render(
      <Card as="section" aria-label="Summary">
        Body
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'Summary' })).toHaveTextContent('Body');
  });

  it('CardHeader renders a heading, subtitle and actions', () => {
    render(
      <CardHeader
        title="Supplies"
        subtitle="For this week"
        actions={<button>Print</button>}
        as="h3"
      />,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Supplies' })).toBeInTheDocument();
    expect(screen.getByText('For this week')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renders its content under a dashed rule', () => {
    render(<CardFooter>Legend</CardFooter>);
    expect(screen.getByText('Legend')).toHaveClass('border-t', 'border-dashed');
  });
});
