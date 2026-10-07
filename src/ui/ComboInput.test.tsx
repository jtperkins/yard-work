import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ComboInput } from './ComboInput';
import { Field } from './Field';

describe('ComboInput', () => {
  it('links a datalist of unique, non-empty suggestions and accepts free text', async () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <Field label="Done by">
        <ComboInput suggestions={['JT', 'Neighbor', 'JT', ' ']} onValueChange={onValueChange} />
      </Field>,
    );
    const input = screen.getByRole('combobox', { name: 'Done by' });
    const listId = input.getAttribute('list')!;
    const list = container.querySelector(`datalist[id="${listId}"]`)!;
    expect(Array.from(list.querySelectorAll('option')).map((o) => o.value)).toEqual([
      'JT',
      'Neighbor',
    ]);
    await userEvent.type(input, 'Ana');
    expect(onValueChange).toHaveBeenLastCalledWith('Ana');
  });
});
