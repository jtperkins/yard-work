import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileInput } from './FileInput';

describe('FileInput', () => {
  it('has a trigger button and reports the picked files', async () => {
    const user = userEvent.setup();
    const onFiles = vi.fn();
    render(<FileInput label="Add files" accept="image/*" multiple onFiles={onFiles} />);
    expect(screen.getByRole('button', { name: 'Add files' })).toBeEnabled();

    const input = screen.getByLabelText('Add files');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/*');
    expect(input).toHaveAttribute('multiple');

    const a = new File(['a'], 'a.png', { type: 'image/png' });
    const b = new File(['b'], 'b.png', { type: 'image/png' });
    await user.upload(input, [a, b]);
    expect(onFiles).toHaveBeenCalledWith([a, b]);
  });

  it('opens the picker from the button and is inert when disabled', async () => {
    const user = userEvent.setup();
    const onFiles = vi.fn();
    const { rerender } = render(<FileInput label="Add" onFiles={onFiles} />);
    const click = vi.spyOn(screen.getByLabelText('Add'), 'click');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(click).toHaveBeenCalledTimes(1);

    rerender(<FileInput label="Add" onFiles={onFiles} disabled />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByLabelText('Add')).toBeDisabled();
  });
});
