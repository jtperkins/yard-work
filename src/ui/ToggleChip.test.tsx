import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToggleChip } from './ToggleChip';

describe('ToggleChip', () => {
  it('reflects pressed state and reports the toggled value', async () => {
    const onPressedChange = vi.fn();
    const { rerender } = render(
      <ToggleChip
        label="Cats"
        color="cat-cats"
        pressed={false}
        onPressedChange={onPressedChange}
        count={3}
      />,
    );
    const btn = screen.getByRole('button', { name: /Cats/ });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(btn);
    expect(onPressedChange).toHaveBeenCalledWith(true);

    rerender(<ToggleChip label="Cats" pressed onPressedChange={onPressedChange} />);
    expect(screen.getByRole('button', { name: 'Cats' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Cats' }));
    expect(onPressedChange).toHaveBeenLastCalledWith(false);
  });
});
