import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { TextLink } from './TextLink';

describe('TextLink', () => {
  it('renders an anchor', () => {
    render(<TextLink href="/log">Log</TextLink>);
    expect(screen.getByRole('link', { name: 'Log' })).toHaveAttribute('href', '/log');
  });

  it('accepts a router link via `as`', () => {
    const Fake = ({ to, children }: { to: string; children?: ReactNode }) => (
      <a href={to}>{children}</a>
    );
    render(
      <TextLink as={Fake} to="/tasks" tone="muted">
        Back
      </TextLink>,
    );
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/tasks');
  });
});
