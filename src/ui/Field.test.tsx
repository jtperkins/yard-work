import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';
import { Input } from './Input';

describe('Field', () => {
  it('labels the control and wires hint via aria-describedby', () => {
    render(
      <Field label="Done by" hint="Who did the work">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText('Done by');
    expect(input).toHaveAccessibleDescription('Who did the work');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('marks the control invalid and announces the error first', () => {
    render(
      <Field label="Name" hint="1–40 characters" error="Required" required>
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText('Name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Required 1–40 characters');
  });

  it('shows the optional label only for non-required fields', () => {
    render(
      <Field label="Note" optionalLabel="optional">
        <Input />
      </Field>,
    );
    expect(screen.getByText('optional')).toBeInTheDocument();
  });
});
