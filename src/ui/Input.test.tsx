import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('calls onValueChange and native onChange', async () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    function Harness() {
      const [v, setV] = useState('');
      return (
        <Input
          aria-label="Search"
          value={v}
          onChange={onChange}
          onValueChange={(next) => {
            setV(next);
            onValueChange(next);
          }}
        />
      );
    }
    render(<Harness />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Search' }), 'mow');
    expect(onValueChange).toHaveBeenLastCalledWith('mow');
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('renders a leading icon and supports invalid', () => {
    const { container } = render(<Input aria-label="Q" leadingIcon={Search} invalid />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
