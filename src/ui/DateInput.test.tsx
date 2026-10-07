import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateInput } from './DateInput';
import { Field } from './Field';

describe('DateInput', () => {
  it('is a date input with max and reports ISO values', () => {
    const onValueChange = vi.fn();
    render(
      <Field label="Date">
        <DateInput value="2026-10-07" max="2026-10-07" onValueChange={onValueChange} />
      </Field>,
    );
    const input = screen.getByLabelText('Date');
    expect(input).toHaveAttribute('type', 'date');
    expect(input).toHaveAttribute('max', '2026-10-07');
    fireEvent.change(input, { target: { value: '2026-10-05' } });
    expect(onValueChange).toHaveBeenCalledWith('2026-10-05');
  });
});
