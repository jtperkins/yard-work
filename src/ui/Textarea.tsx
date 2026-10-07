import type { ChangeEvent, TextareaHTMLAttributes, Ref } from 'react';
import { controlClasses, useFieldControl } from './Field';
import { cx } from './cx';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

/** Multi-line text input (vertically resizable). */
export function Textarea({
  onValueChange,
  onChange,
  invalid,
  className,
  id,
  required,
  rows = 3,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: TextareaProps) {
  const a11y = useFieldControl({
    id,
    required,
    invalid,
    'aria-describedby': describedBy,
    'aria-invalid': ariaInvalid,
  });
  const handle = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e);
    onValueChange?.(e.target.value);
  };
  return (
    <textarea
      rows={rows}
      onChange={handle}
      className={cx(controlClasses, 'min-h-20 resize-y px-3 py-2.5 leading-relaxed', className)}
      {...a11y}
      {...rest}
    />
  );
}
