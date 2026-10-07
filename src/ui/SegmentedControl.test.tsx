import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

type V = 'all' | 'mine' | 'yard';

function Harness({ onChange }: { onChange: (v: V) => void }) {
  const [value, setValue] = useState<V>('all');
  return (
    <SegmentedControl<V>
      label="Show"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      options={[
        { value: 'all', label: 'All' },
        { value: 'mine', label: 'Mine' },
        { value: 'yard', label: 'Yard', disabled: true },
      ]}
    />
  );
}

describe('SegmentedControl', () => {
  it('is a radiogroup with one tab stop on the selected option', () => {
    render(<Harness onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Show' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Mine' })).toHaveAttribute('tabindex', '-1');
  });

  it('selects on click and moves with arrow keys, skipping disabled options', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Mine' }));
    expect(onChange).toHaveBeenLastCalledWith('mine');
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('all');
    expect(screen.getByRole('radio', { name: 'All' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('mine');
    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('all');
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('mine');
  });
});
