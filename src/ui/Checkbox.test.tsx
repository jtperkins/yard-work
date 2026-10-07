import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('toggles via the label and keyboard', async () => {
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        checked={false}
        onCheckedChange={onCheckedChange}
        label="Have it"
        description="Ant bait"
      />,
    );
    const cb = screen.getByRole('checkbox', { name: 'Have it' });
    expect(cb).toHaveAccessibleDescription('Ant bait');
    await userEvent.click(screen.getByText('Have it'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    cb.focus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledTimes(2);
  });

  it('reflects checked and disabled', () => {
    render(<Checkbox checked onCheckedChange={() => {}} label="Done" disabled strikeWhenChecked />);
    const cb = screen.getByRole('checkbox', { name: 'Done' });
    expect(cb).toBeChecked();
    expect(cb).toBeDisabled();
  });
});
