import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Disclosure } from './Disclosure';

describe('Disclosure', () => {
  it('toggles its content with aria-expanded', async () => {
    const user = userEvent.setup();
    render(
      <Disclosure summary="More">
        <p>Hidden text</p>
      </Disclosure>,
    );
    const toggle = screen.getByRole('button', { name: 'More' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Hidden text')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Hidden text')).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByText('Hidden text')).not.toBeInTheDocument();
  });

  it('can start open', () => {
    render(
      <Disclosure summary="More" defaultOpen>
        <p>Shown</p>
      </Disclosure>,
    );
    expect(screen.getByText('Shown')).toBeInTheDocument();
  });
});
