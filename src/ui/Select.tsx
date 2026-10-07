import type { ChangeEvent, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { controlClasses, useFieldControl } from './Field';
import { cx } from './cx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'children' | 'size' | 'multiple'
> {
  options: readonly SelectOption[];
  /** Adds a first empty option with this label (value ""). */
  placeholder?: string;
  onValueChange?: (value: string) => void;
  invalid?: boolean;
  size?: 'sm' | 'md';
}

/** Native single-select styled to match the inputs. */
export function Select({
  options,
  placeholder,
  onValueChange,
  onChange,
  invalid,
  size = 'md',
  className,
  id,
  required,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: SelectProps) {
  const a11y = useFieldControl({
    id,
    required,
    invalid,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
  });
  const handle = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e);
    onValueChange?.(e.target.value);
  };
  return (
    <span className={cx('relative block', className)}>
      <select
        onChange={handle}
        className={cx(
          controlClasses,
          'cursor-pointer appearance-none pl-3 pr-9',
          size === 'sm' ? 'h-9 sm:h-8' : 'h-11 sm:h-10',
        )}
        {...a11y}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
      />
    </span>
  );
}
