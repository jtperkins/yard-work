import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { ListRow } from './ListRow';

function FakeLink({
  to,
  children,
  className,
}: {
  to: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <a href={`#${to}`} className={className} data-router-link>
      {children}
    </a>
  );
}

describe('ListRow', () => {
  it('renders a list item whose whole row is a link', () => {
    render(
      <ul>
        <ListRow
          href="/tasks/mow"
          title="Mow"
          meta="Every 7 days"
          trailing={<span>Due</span>}
          color="cat-lawn"
        />
      </ul>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/tasks/mow');
    expect(link).toHaveTextContent('MowEvery 7 daysDue');
    expect(screen.getByRole('listitem').getAttribute('style')).toContain('--swatch');
  });

  it('is polymorphic over a router link', () => {
    render(
      <ul>
        <ListRow as={FakeLink} to="/x" title="X" />
      </ul>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('data-router-link');
    expect(screen.getByRole('link')).toHaveAttribute('href', '#/x');
  });
});
