import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field } from './Field';
import { Select } from './Select';

describe('Select', () => {
  it('renders options with a placeholder and reports the chosen value', async () => {
    const onValueChange = vi.fn();
    render(
      <Field label="Person">
        <Select
          placeholder="Anyone"
          value=""
          onValueChange={onValueChange}
          options={[
            { value: 'jt', label: 'JT' },
            { value: 'yw', label: 'Yard worker' },
          ]}
        />
      </Field>,
    );
    const select = screen.getByRole('combobox', { name: 'Person' });
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await userEvent.selectOptions(select, 'yw');
    expect(onValueChange).toHaveBeenCalledWith('yw');
  });
});
