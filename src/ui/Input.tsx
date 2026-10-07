import type { ChangeEvent, InputHTMLAttributes, Ref } from 'react';
import { controlClasses, useFieldControl } from './Field';
import { cx } from './cx';
import type { IconComponent } from './types';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Convenience: called with the new string value (alongside any native onChange). */
  onValueChange?: (value: string) => void;
  /** Icon inside the left edge. */
  leadingIcon?: IconComponent;
  invalid?: boolean;
  /** Ref to the native input (React 19 ref-as-prop). */
  ref?: Ref<HTMLInputElement>;
}

/** Single-line text input. Inside a Field it picks up id/label/hint/error wiring. */
export function Input({
  onValueChange,
  onChange,
  leadingIcon: Icon,
  invalid,
  className,
  id,
  required,
  type = 'text',
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: InputProps) {
  const a11y = useFieldControl({
    id,
    required,
    invalid,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
  });
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    onValueChange?.(e.target.value);
  };
  const input = (
    <input
      type={type}
      onChange={handle}
      className={cx(controlClasses, 'h-11 px-3 sm:h-10', Icon && 'pl-9', className)}
      {...a11y}
      {...rest}
    />
  );
  if (!Icon) return input;
  return (
    <span className="relative block">
      <Icon
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
      />
      {input}
    </span>
  );
}
