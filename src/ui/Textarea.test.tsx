import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field } from './Field';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('is labelled by Field and reports values', async () => {
    const onValueChange = vi.fn();
    render(
      <Field label="Note">
        <Textarea onValueChange={onValueChange} />
      </Field>,
    );
    await userEvent.type(screen.getByLabelText('Note'), 'hi');
    expect(onValueChange).toHaveBeenLastCalledWith('hi');
  });
});
