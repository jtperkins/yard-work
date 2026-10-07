import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { X } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('has an accessible name and tooltip from `label`', async () => {
    const onClick = vi.fn();
    render(<IconButton label="Close" icon={X} onClick={onClick} />);
    const btn = screen.getByRole('button', { name: 'Close' });
    expect(btn).toHaveAttribute('title', 'Close');
    expect(btn.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('respects disabled', () => {
    render(<IconButton label="Delete" icon={X} disabled />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
});
